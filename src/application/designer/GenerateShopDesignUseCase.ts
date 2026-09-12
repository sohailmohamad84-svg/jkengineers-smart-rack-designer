import { prisma } from '../../infrastructure/db/prisma';
import { container } from '../../infrastructure/di/container';
import { MeasurementService, DisplayUnit } from '../../domain/services/MeasurementService';
import { RackDesignEngine } from '../../domain/services/RackDesignEngine';
import { ShopSpecification, ShopOpening, ShopObstacle } from '../../domain/entities/Shop';
import { StoreLayoutResult, DesignOption } from '../../domain/entities/Design';

export interface GenerateDesignInput {
  projectId?: string;
  customerId: string;
  storeTypeCode: string;
  budget: number;
  shape?: 'RECTANGLE' | 'SQUARE' | 'L_SHAPED' | 'CUSTOM';
  dimensions: {
    length: number;
    breadth: number;
    height: number;
    unit: DisplayUnit;
    lengthInches?: number;
    breadthInches?: number;
  };
  openings: Array<{
    type: 'DOOR_MAIN' | 'DOOR_EXIT' | 'DOOR_ADDITIONAL' | 'WINDOW';
    wall: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
    distanceMm: number;
    widthMm: number;
    heightMm: number;
    swingDirection: 'INSIDE' | 'OUTSIDE' | 'NONE';
  }>;
  obstacles: Array<{
    type: 'PILLAR' | 'COLUMN' | 'ELECTRICAL_PANEL' | 'STAIRCASE' | 'COUNTER' | 'BEAM' | 'REFRIGERATOR' | 'OTHER';
    posX: number;
    posY: number;
    widthMm: number;
    depthMm: number;
    heightMm: number;
    wall?: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | null;
  }>;
  requirements?: Record<string, boolean>;
}

export class GenerateShopDesignUseCase {
  public static async execute(input: GenerateDesignInput): Promise<{
    success: boolean;
    message: string;
    projectCode?: string;
    projectId?: string;
    result?: StoreLayoutResult;
  }> {
    try {
      // 1. Convert display dimensions to canonical mm
      const lengthMm = MeasurementService.toMillimeters(
        input.dimensions.length,
        input.dimensions.unit,
        input.dimensions.lengthInches
      );
      const breadthMm = MeasurementService.toMillimeters(
        input.dimensions.breadth,
        input.dimensions.unit,
        input.dimensions.breadthInches
      );
      const heightMm = MeasurementService.toMillimeters(
        input.dimensions.height,
        input.dimensions.unit
      );

      const canonicalDimensions = {
        lengthMm,
        breadthMm,
        heightMm,
        displayUnit: input.dimensions.unit,
      };

      // 2. Validate shop geometry
      const validation = MeasurementService.validateShopGeometry(
        canonicalDimensions,
        input.openings,
        input.obstacles
      );

      if (!validation.isValid) {
        return {
          success: false,
          message: `Geometry Validation Error: ${validation.errors.join(' ')}`,
        };
      }

      // 3. Find Store Type
      const storeType = await prisma.storeType.findUnique({
        where: { code: input.storeTypeCode },
      });
      if (!storeType) {
        return { success: false, message: `Store type "${input.storeTypeCode}" not found.` };
      }

      // 4. Upsert Project
      let project;
      if (input.projectId) {
        project = await prisma.project.update({
          where: { id: input.projectId },
          data: {
            budget: input.budget,
            storeTypeId: storeType.id,
            status: 'DESIGNED',
          },
        });
      } else {
        const count = await prisma.project.count();
        const code = `JK-2026-${String(count + 1).padStart(6, '0')}`;
        project = await prisma.project.create({
          data: {
            projectCode: code,
            customerId: input.customerId,
            storeTypeId: storeType.id,
            budget: input.budget,
            status: 'DESIGNED',
            leadStatus: 'DESIGN_PREPARED',
          },
        });
      }

      // 5. Upsert Shop, Dimensions, Openings & Obstacles
      const shop = await prisma.shop.upsert({
        where: { projectId: project.id },
        update: { shape: input.shape || 'RECTANGLE' },
        create: {
          projectId: project.id,
          shape: input.shape || 'RECTANGLE',
        },
      });

      await prisma.shopDimensions.upsert({
        where: { shopId: shop.id },
        update: {
          lengthMm,
          breadthMm,
          heightMm,
          displayUnit: input.dimensions.unit,
        },
        create: {
          shopId: shop.id,
          lengthMm,
          breadthMm,
          heightMm,
          displayUnit: input.dimensions.unit,
        },
      });

      // Clear previous openings and obstacles for fresh generation
      await prisma.shopOpening.deleteMany({ where: { shopId: shop.id } });
      await prisma.shopObstacle.deleteMany({ where: { shopId: shop.id } });

      if (input.openings.length > 0) {
        await prisma.shopOpening.createMany({
          data: input.openings.map((o) => ({
            shopId: shop.id,
            type: o.type,
            wall: o.wall,
            distanceMm: o.distanceMm,
            widthMm: o.widthMm,
            heightMm: o.heightMm,
            swingDirection: o.swingDirection,
          })),
        });
      }

      if (input.obstacles.length > 0) {
        await prisma.shopObstacle.createMany({
          data: input.obstacles.map((obs) => ({
            shopId: shop.id,
            type: obs.type,
            posX: obs.posX,
            posY: obs.posY,
            widthMm: obs.widthMm,
            depthMm: obs.depthMm,
            heightMm: obs.heightMm,
            wall: obs.wall || null,
          })),
        });
      }

      // 6. Fetch Racks & Materials via Repository
      const catalogRacks = await container.rackRepository.getAllActiveRacks();
      const activeMaterials = await container.materialRepository.getAllActiveMaterials();

      const shopSpec: ShopSpecification = {
        id: shop.id,
        shape: input.shape || 'RECTANGLE',
        dimensions: canonicalDimensions,
        openings: input.openings,
        obstacles: input.obstacles,
      };

      // 7. Run Spatial Design Engine
      const layoutResult = RackDesignEngine.generateLayoutOptions(
        shopSpec,
        input.storeTypeCode,
        input.budget,
        catalogRacks,
        activeMaterials,
        input.requirements || {}
      );
      layoutResult.projectId = project.id;

      // 8. Persist Design, Versions, Placed Racks and Estimates in Relational DB
      let design = await prisma.design.findFirst({
        where: { projectId: project.id },
      });

      if (!design) {
        design = await prisma.design.create({
          data: {
            projectId: project.id,
            designCode: `D-${project.projectCode}`,
          },
        });
      }

      // Delete old versions to avoid zombie records on re-runs
      await prisma.designVersion.deleteMany({ where: { designId: design.id } });

      let balancedVersionId = '';

      for (const opt of layoutResult.options) {
        const createdVersion = await prisma.designVersion.create({
          data: {
            designId: design.id,
            versionNumber: opt.versionNumber,
            optionType: opt.optionType,
            totalRacks: opt.totalRacks,
            totalDisplayAreaSqM: opt.totalDisplayAreaSqM,
            floorAreaSqM: opt.floorAreaSqM,
            aisleWidthMm: opt.aisleWidthMm,
            explanation: opt.explanation,
            estimate: {
              create: {
                totalMaterialCost: opt.estimate.totalMaterialCost,
                totalFabricationCost: opt.estimate.totalFabricationCost,
                totalPowderCoatingCost: opt.estimate.totalPowderCoatingCost,
                totalLaborCost: opt.estimate.totalLaborCost,
                totalInstallationCost: opt.estimate.totalInstallationCost,
                totalTransportationCost: opt.estimate.totalTransportationCost,
                totalGstCost: opt.estimate.totalGstCost,
                grandTotal: opt.estimate.grandTotal,
                minRange: opt.estimate.minRange,
                maxRange: opt.estimate.maxRange,
                isIndicative: true,
                items: {
                  create: opt.estimate.items.map((it) => ({
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

        // Link ID back into domain option
        opt.id = createdVersion.id;

        if (opt.optionType === 'OPTION_B_BALANCED') {
          balancedVersionId = createdVersion.id;
        }

        // Map PlacedRacks to database rows
        for (const rack of opt.racks) {
          const matchedType = catalogRacks.find((r) => r.code === rack.rackTypeCode) || catalogRacks[0];
          await prisma.designRack.create({
            data: {
              designVersionId: createdVersion.id,
              rackTypeId: matchedType.id,
              label: rack.label,
              posX: rack.posX,
              posY: rack.posY,
              rotation: rack.rotation,
              widthMm: rack.widthMm,
              depthMm: rack.depthMm,
              heightMm: rack.heightMm,
              shelvesCount: rack.shelvesCount,
              wallPlacement: rack.wallPlacement || null,
            },
          });
        }
      }

      // Set active version
      await prisma.design.update({
        where: { id: design.id },
        data: { activeVersionId: balancedVersionId },
      });

      return {
        success: true,
        message: 'Custom shop design successfully generated.',
        projectCode: project.projectCode,
        projectId: project.id,
        result: layoutResult,
      };
    } catch (err: any) {
      console.error('[GenerateShopDesignUseCase] Error:', err);
      return {
        success: false,
        message: 'Something went wrong while generating your design. Your measurements have been saved. Please try again.',
      };
    }
  }
}
