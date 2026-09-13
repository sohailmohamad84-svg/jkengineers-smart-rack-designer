import { NextRequest, NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/auth-guard';
import { prisma } from '@/infrastructure/db/prisma';
import { container } from '@/infrastructure/di/container';
import { PricingEngine } from '@/domain/services/PricingEngine';
import { PlacedRack } from '@/domain/entities/Rack';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, errorResponse } = requireCustomer(req);
  if (errorResponse) return errorResponse;

  try {
    const projectId = params.id;
    const body = await req.json();
    const racks: PlacedRack[] = Array.isArray(body.racks) ? body.racks : [];
    const includeInstallation = body.includeInstallation !== false;
    const note = body.note || 'Custom arrangement saved by customer';

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        customer: true,
        shop: {
          include: {
            dimensions: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
    }

    // Customer authorization check (customer must own the project, unless admin)
    if (session!.role === 'CUSTOMER' && project.customer.userId !== session!.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized for this project' }, { status: 403 });
    }

    // Find or create design
    let design = await prisma.design.findFirst({
      where: { projectId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!design) {
      design = await prisma.design.create({
        data: {
          projectId,
          designCode: `D-${project.projectCode}`,
        },
        include: {
          versions: true,
        },
      });
    }

    // Determine next version number (never overwrite!)
    const currentMaxVersion = design.versions.length > 0 ? design.versions[0].versionNumber : 0;
    const nextVersionNumber = currentMaxVersion + 1;

    // Fetch active materials for deterministic pricing
    const activeMaterials = await container.materialRepository.getAllActiveMaterials();
    const estimate = PricingEngine.calculateEstimate(racks, activeMaterials, includeInstallation);

    // Calculate display area and floor area
    let totalDisplayAreaSqM = 0;
    for (const r of racks) {
      const shelfArea = (r.widthMm / 1000) * (r.depthMm / 1000) * (r.shelvesCount || 5);
      totalDisplayAreaSqM += shelfArea;
    }
    totalDisplayAreaSqM = Math.round(totalDisplayAreaSqM * 10) / 10;

    const lengthMm = project.shop?.dimensions?.lengthMm || 6000;
    const breadthMm = project.shop?.dimensions?.breadthMm || 4500;
    const floorAreaSqM = Math.round(((lengthMm / 1000) * (breadthMm / 1000)) * 10) / 10;

    // Fetch catalog racks to map rackTypeId
    const catalogRacks = await prisma.rackType.findMany({ where: { active: true } });
    const defaultRackType = catalogRacks[0];

    // Create new immutable DesignVersion with Estimate and EstimateItems
    const newVersion = await prisma.designVersion.create({
      data: {
        designId: design.id,
        versionNumber: nextVersionNumber,
        optionType: 'CUSTOM_ARRANGEMENT',
        totalRacks: racks.length,
        totalDisplayAreaSqM,
        floorAreaSqM,
        aisleWidthMm: 1000,
        explanation: `${note} (Version ${nextVersionNumber})`,
        estimate: {
          create: {
            totalMaterialCost: estimate.totalMaterialCost,
            totalFabricationCost: estimate.totalFabricationCost,
            totalPowderCoatingCost: estimate.totalPowderCoatingCost,
            totalLaborCost: estimate.totalLaborCost,
            totalInstallationCost: estimate.totalInstallationCost,
            totalTransportationCost: estimate.totalTransportationCost,
            totalGstCost: estimate.totalGstCost,
            grandTotal: estimate.grandTotal,
            minRange: estimate.minRange,
            maxRange: estimate.maxRange,
            isIndicative: true,
            items: {
              create: estimate.items.map((it) => ({
                itemType: it.itemType,
                description: it.description,
                quantity: it.quantity,
                unit: it.unit,
                unitRate: it.unitRate,
                totalAmount: it.totalAmount,
              })),
            },
          },
        },
      },
    });

    // Create DesignRack rows for this version
    for (const rack of racks) {
      const matchedType = catalogRacks.find((c) => c.code === rack.rackTypeCode) || defaultRackType;
      await prisma.designRack.create({
        data: {
          designVersionId: newVersion.id,
          rackTypeId: matchedType ? matchedType.id : '',
          label: rack.label || 'Custom Rack',
          posX: rack.posX,
          posY: rack.posY,
          rotation: rack.rotation || 0,
          widthMm: rack.widthMm,
          depthMm: rack.depthMm,
          heightMm: rack.heightMm,
          shelvesCount: rack.shelvesCount || 5,
          wallPlacement: rack.wallPlacement || null,
        },
      });
    }

    // Update active version
    await prisma.design.update({
      where: { id: design.id },
      data: { activeVersionId: newVersion.id },
    });

    // Audit log
    await container.auditService.log({
      action: 'DESIGN_VERSION_SAVED',
      entityType: 'DESIGN_VERSION',
      entityId: newVersion.id,
      actorId: session!.userId,
      actorRole: session!.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
      newValue: {
        projectId,
        versionNumber: nextVersionNumber,
        totalRacks: racks.length,
        grandTotal: estimate.grandTotal,
      },
    });

    // Retrieve complete created version
    const completeVersion = await prisma.designVersion.findUnique({
      where: { id: newVersion.id },
      include: {
        estimate: {
          include: { items: true },
        },
        racks: {
          include: { rackType: true },
        },
      },
    });

    const subTotal = estimate.subTotal ?? Math.round(estimate.grandTotal - (estimate.totalGstCost || 0));

    const responseVersion = {
      ...completeVersion,
      estimate: completeVersion?.estimate
        ? {
            ...completeVersion.estimate,
            subTotal,
            disclaimer:
              estimate.disclaimer ||
              'This quotation is an authoritative engineering estimate based on client shop dimensions and active raw material rates.',
            items: completeVersion.estimate.items || estimate.items || [],
          }
        : estimate,
    };

    return NextResponse.json({
      success: true,
      message: `Successfully saved Layout Version ${nextVersionNumber}`,
      version: responseVersion,
    });
  } catch (error: any) {
    console.error('[API /api/projects/:id/versions] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to save new design version' },
      { status: 500 }
    );
  }
}
