import { IMaterialRepository } from '../../domain/ports/IMaterialRepository';
import { MaterialRate, MaterialPriceAudit, MaterialCategory, MaterialUnit } from '../../domain/entities/Material';
import { prisma } from '../db/prisma';

export class PrismaMaterialRepository implements IMaterialRepository {
  public async getAllActiveMaterials(): Promise<MaterialRate[]> {
    const records = await prisma.material.findMany({
      where: { active: true },
      include: {
        currentPrice: true,
        priceHistory: {
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
      },
    });

    return records.map((m) => {
      const prev = m.priceHistory[0]?.previousRate;
      return {
        id: m.id,
        code: m.code,
        name: m.name,
        category: m.category as MaterialCategory,
        unit: m.unit as MaterialUnit,
        currentRate: m.currentPrice?.currentRate || 0,
        effectiveDate: m.currentPrice?.effectiveDate || new Date(),
        previousRate: prev,
        notes: m.notes,
      };
    });
  }

  public async getMaterialByCode(code: string): Promise<MaterialRate | null> {
    const m = await prisma.material.findUnique({
      where: { code },
      include: {
        currentPrice: true,
        priceHistory: {
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!m) return null;

    return {
      id: m.id,
      code: m.code,
      name: m.name,
      category: m.category as MaterialCategory,
      unit: m.unit as MaterialUnit,
      currentRate: m.currentPrice?.currentRate || 0,
      effectiveDate: m.currentPrice?.effectiveDate || new Date(),
      previousRate: m.priceHistory[0]?.previousRate,
      notes: m.notes,
    };
  }

  public async updateMaterialPrice(audit: MaterialPriceAudit): Promise<MaterialRate> {
    const material = await prisma.material.findUnique({
      where: { id: audit.materialId },
      include: { currentPrice: true },
    });

    if (!material) {
      throw new Error(`Material with ID ${audit.materialId} not found`);
    }

    const previousRate = material.currentPrice?.currentRate || audit.previousRate;

    // 1. Log immutable price history record (Rule 20)
    await prisma.materialPriceHistory.create({
      data: {
        materialId: material.id,
        previousRate,
        newRate: audit.newRate,
        effectiveDate: audit.effectiveDate || new Date(),
        changedByAdminId: audit.changedByAdminId,
        changeReason: audit.changeReason || 'Market adjustment by administrator',
      },
    });

    // 2. Upsert current active price
    await prisma.materialPrice.upsert({
      where: { materialId: material.id },
      update: {
        currentRate: audit.newRate,
        effectiveDate: audit.effectiveDate || new Date(),
      },
      create: {
        materialId: material.id,
        currentRate: audit.newRate,
        effectiveDate: audit.effectiveDate || new Date(),
      },
    });

    return {
      id: material.id,
      code: material.code,
      name: material.name,
      category: material.category as MaterialCategory,
      unit: material.unit as MaterialUnit,
      currentRate: audit.newRate,
      effectiveDate: new Date(),
      previousRate,
      notes: material.notes,
    };
  }

  public async getPriceHistoryForMaterial(materialId: string): Promise<any[]> {
    return prisma.materialPriceHistory.findMany({
      where: { materialId },
      orderBy: { effectiveDate: 'desc' },
    });
  }
}
