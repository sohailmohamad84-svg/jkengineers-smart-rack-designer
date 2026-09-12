import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth-guard';
import { prisma } from '@/infrastructure/db/prisma';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id;
    const { searchParams } = new URL(req.url);
    const versionId = searchParams.get('versionId');

    // Retrieve project with complete relations
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        customer: {
          include: { user: true },
        },
        storeType: true,
        shop: {
          include: {
            dimensions: true,
            openings: true,
            obstacles: true,
          },
        },
        designs: {
          include: {
            versions: {
              orderBy: { versionNumber: 'desc' },
              include: {
                estimate: {
                  include: { items: true },
                },
                racks: {
                  include: { rackType: true },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
    }

    // Optional auth check: if token present, verify customer ownership
    const session = getSessionFromRequest(req);
    if (session && session.role === 'CUSTOMER' && project.customer.userId !== session.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized for this quotation' }, { status: 403 });
    }

    const design = project.designs[0];
    if (!design || !design.versions || design.versions.length === 0) {
      return NextResponse.json({ success: false, message: 'No design layout found for project' }, { status: 404 });
    }

    // Determine target version
    let targetVersion = design.versions[0];
    if (versionId) {
      const found = design.versions.find((v) => v.id === versionId);
      if (found) targetVersion = found;
    } else if (design.activeVersionId) {
      const active = design.versions.find((v) => v.id === design.activeVersionId);
      if (active) targetVersion = active;
    }

    const dateStr = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    // Prepare JSON payload for Python ReportLab generator
    const payload = {
      projectCode: project.projectCode,
      versionNumber: targetVersion.versionNumber,
      dateStr,
      customer: {
        fullName: project.customer.fullName || 'Valued Customer',
        businessName: project.customer.businessName || 'Retail Store',
        mobile: project.customer.user?.mobile || '',
        shopLocation: project.customer.shopLocation || 'Mumbai, Maharashtra',
      },
      shop: {
        lengthMm: project.shop?.dimensions?.lengthMm || 6000,
        breadthMm: project.shop?.dimensions?.breadthMm || 4500,
        heightMm: project.shop?.dimensions?.heightMm || 3000,
        storeTypeName: project.storeType?.name || 'Retail Store',
        openings: project.shop?.openings || [],
        obstacles: project.shop?.obstacles || [],
      },
      version: {
        totalRacks: targetVersion.totalRacks,
        totalDisplayAreaSqM: targetVersion.totalDisplayAreaSqM,
        floorAreaSqM: targetVersion.floorAreaSqM,
        aisleWidthMm: targetVersion.aisleWidthMm,
        explanation: targetVersion.explanation,
      },
      racks: targetVersion.racks.map((r) => ({
        rackTypeCode: r.rackType?.code || 'WALL_RACK',
        rackTypeName: r.rackType?.name || 'Modular Wall Rack',
        category: r.rackType?.category || 'WALL_RACK',
        label: r.label,
        posX: r.posX,
        posY: r.posY,
        rotation: r.rotation,
        widthMm: r.widthMm,
        depthMm: r.depthMm,
        heightMm: r.heightMm,
        shelvesCount: r.shelvesCount,
      })),
      estimate: targetVersion.estimate
        ? {
            totalMaterialCost: targetVersion.estimate.totalMaterialCost,
            totalFabricationCost: targetVersion.estimate.totalFabricationCost,
            totalPowderCoatingCost: targetVersion.estimate.totalPowderCoatingCost,
            totalLaborCost: targetVersion.estimate.totalLaborCost,
            totalInstallationCost: targetVersion.estimate.totalInstallationCost,
            totalTransportationCost: targetVersion.estimate.totalTransportationCost,
            subTotal:
              targetVersion.estimate.totalMaterialCost +
              targetVersion.estimate.totalFabricationCost +
              targetVersion.estimate.totalPowderCoatingCost +
              targetVersion.estimate.totalInstallationCost +
              targetVersion.estimate.totalTransportationCost,
            totalGstCost: targetVersion.estimate.totalGstCost,
            grandTotal: targetVersion.estimate.grandTotal,
            minRange: targetVersion.estimate.minRange,
            maxRange: targetVersion.estimate.maxRange,
            items: targetVersion.estimate.items.map((it) => ({
              itemType: it.itemType,
              description: it.description,
              quantity: it.quantity,
              unit: it.unit,
              unitRate: it.unitRate,
              totalAmount: it.totalAmount,
            })),
          }
        : {
            items: [],
          },
    };

    // Write temp JSON file
    const tempDir = os.tmpdir();
    const tempJsonPath = path.join(tempDir, `jk-quo-${project.projectCode}-v${targetVersion.versionNumber}-${Date.now()}.json`);
    const tempPdfPath = path.join(tempDir, `jk-quo-${project.projectCode}-v${targetVersion.versionNumber}-${Date.now()}.pdf`);

    await fs.writeFile(tempJsonPath, JSON.stringify(payload, null, 2), 'utf-8');

    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_quotation_pdf.py');

    try {
      // Execute Python PDF generator
      await execFileAsync('python', [scriptPath, tempJsonPath, tempPdfPath], {
        timeout: 30000,
      });

      // Read compiled PDF
      const pdfBuffer = await fs.readFile(tempPdfPath);

      // Clean up temp files
      await Promise.allSettled([fs.unlink(tempJsonPath), fs.unlink(tempPdfPath)]);

      const filename = `JK-Engineers-Works-Quotation-${project.projectCode}-V${targetVersion.versionNumber}.pdf`;

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (execErr: any) {
      console.error('[PDF Generation Script Error]:', execErr);
      await Promise.allSettled([fs.unlink(tempJsonPath), fs.unlink(tempPdfPath)]);
      return NextResponse.json(
        {
          success: false,
          message: 'Error executing server-side PDF generator: ' + (execErr.stderr || execErr.message),
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[API /api/projects/:id/pdf] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error while generating PDF quotation' },
      { status: 500 }
    );
  }
}
