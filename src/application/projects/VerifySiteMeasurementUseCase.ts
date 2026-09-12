import { prisma } from '../../infrastructure/db/prisma';
import { container } from '../../infrastructure/di/container';
import { GenerateShopDesignUseCase } from '../designer/GenerateShopDesignUseCase';

export interface VerifySiteMeasurementInput {
  projectId: string;
  adminId: string;
  verifiedLengthMm: number;
  verifiedBreadthMm: number;
  verifiedHeightMm: number;
  adminNotes?: string;
  regenerateDesign?: boolean;
}

export class VerifySiteMeasurementUseCase {
  public static async execute(input: VerifySiteMeasurementInput) {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      include: {
        shop: {
          include: {
            dimensions: true,
            openings: true,
            obstacles: true,
          },
        },
        storeType: true,
      },
    });

    if (!project || !project.shop || !project.shop.dimensions) {
      throw new Error(`Project ${input.projectId} not found or has incomplete shop geometry`);
    }

    const previousDimensions = {
      lengthMm: project.shop.dimensions.lengthMm,
      breadthMm: project.shop.dimensions.breadthMm,
      heightMm: project.shop.dimensions.heightMm,
      siteVerified: project.siteVerified,
    };

    // 1. Mark site measurement verified & record verified dimensions
    await prisma.shopDimensions.update({
      where: { shopId: project.shop.id },
      data: {
        verifiedByAdmin: true,
        verifiedLengthMm: input.verifiedLengthMm,
        verifiedBreadthMm: input.verifiedBreadthMm,
        verifiedHeightMm: input.verifiedHeightMm,
        verifiedAt: new Date(),
      },
    });

    await prisma.project.update({
      where: { id: project.id },
      data: {
        siteVerified: true,
        leadStatus: 'SITE_VISIT_REQUIRED',
      },
    });

    // 2. Add admin note if provided
    if (input.adminNotes) {
      await prisma.customerNote.create({
        data: {
          customerId: project.customerId,
          adminId: input.adminId,
          noteText: `[Site Verification]: ${input.adminNotes} (Dimensions: ${input.verifiedLengthMm}mm x ${input.verifiedBreadthMm}mm x ${input.verifiedHeightMm}mm)`,
        },
      });
    }

    // 3. Record Audit Log
    await container.auditService.log({
      actorId: input.adminId,
      actorRole: 'ADMIN',
      action: 'SITE_MEASUREMENT_VERIFIED',
      entityType: 'Project',
      entityId: project.id,
      previousValue: previousDimensions,
      newValue: {
        verifiedLengthMm: input.verifiedLengthMm,
        verifiedBreadthMm: input.verifiedBreadthMm,
        verifiedHeightMm: input.verifiedHeightMm,
        siteVerified: true,
      },
    });

    // 4. Optionally regenerate design with verified dimensions
    if (input.regenerateDesign) {
      await GenerateShopDesignUseCase.execute({
        projectId: project.id,
        customerId: project.customerId,
        storeTypeCode: project.storeType.code,
        budget: project.budget,
        dimensions: {
          length: input.verifiedLengthMm,
          breadth: input.verifiedBreadthMm,
          height: input.verifiedHeightMm,
          unit: 'MM',
        },
        openings: project.shop.openings as any,
        obstacles: project.shop.obstacles as any,
      });
    }

    return {
      success: true,
      message: 'Site measurements successfully verified and recorded.',
    };
  }
}
