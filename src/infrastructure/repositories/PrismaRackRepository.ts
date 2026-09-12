import { IRackRepository } from '../../domain/ports/IRackRepository';
import { RackSpecification, RackCategory } from '../../domain/entities/Rack';
import { prisma } from '../db/prisma';

export class PrismaRackRepository implements IRackRepository {
  public async getAllActiveRacks(): Promise<RackSpecification[]> {
    const records = await prisma.rackType.findMany({
      where: { active: true },
      orderBy: { defaultWidthMm: 'asc' },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  public async getRackByCode(code: string): Promise<RackSpecification | null> {
    const record = await prisma.rackType.findUnique({
      where: { code },
    });
    return record ? this.mapToDomain(record) : null;
  }

  public async getRackById(id: string): Promise<RackSpecification | null> {
    const record = await prisma.rackType.findUnique({
      where: { id },
    });
    return record ? this.mapToDomain(record) : null;
  }

  public async getRacksForStoreType(storeTypeCode: string): Promise<RackSpecification[]> {
    const all = await this.getAllActiveRacks();
    return all.filter(
      (r) =>
        r.compatibleStoreTypes.includes('ALL') ||
        r.compatibleStoreTypes.includes(storeTypeCode)
    );
  }

  public async upsertRack(rack: Partial<RackSpecification>): Promise<RackSpecification> {
    if (!rack.code) throw new Error('Rack code is required for upsert');

    const updated = await prisma.rackType.upsert({
      where: { code: rack.code },
      update: {
        name: rack.name,
        category: rack.category,
        defaultWidthMm: rack.defaultWidthMm,
        defaultHeightMm: rack.defaultHeightMm,
        defaultDepthMm: rack.defaultDepthMm,
        defaultShelves: rack.defaultShelves,
        loadCapacityKg: rack.loadCapacityKg,
        baseShelfDepthMm: rack.baseShelfDepthMm,
        baseCost: rack.baseCost,
        active: rack.active,
        imageMain: rack.imageMain,
        compatibleStoreTypes: rack.compatibleStoreTypes ? JSON.stringify(rack.compatibleStoreTypes) : undefined,
      },
      create: {
        code: rack.code,
        name: rack.name || 'New Rack',
        category: rack.category || 'WALL_RACK',
        defaultWidthMm: rack.defaultWidthMm || 900,
        defaultHeightMm: rack.defaultHeightMm || 2100,
        defaultDepthMm: rack.defaultDepthMm || 450,
        defaultShelves: rack.defaultShelves || 5,
        loadCapacityKg: rack.loadCapacityKg || 70,
        baseShelfDepthMm: rack.baseShelfDepthMm || 450,
        baseCost: rack.baseCost || 5000,
        active: rack.active ?? true,
        imageMain: rack.imageMain,
        compatibleStoreTypes: JSON.stringify(rack.compatibleStoreTypes || ['ALL']),
      },
    });

    return this.mapToDomain(updated);
  }

  private mapToDomain(r: any): RackSpecification {
    let parsedTypes = ['ALL'];
    try {
      if (r.compatibleStoreTypes) parsedTypes = JSON.parse(r.compatibleStoreTypes);
    } catch {}

    return {
      id: r.id,
      code: r.code,
      name: r.name,
      category: r.category as RackCategory,
      defaultWidthMm: r.defaultWidthMm,
      defaultHeightMm: r.defaultHeightMm,
      defaultDepthMm: r.defaultDepthMm,
      defaultShelves: r.defaultShelves,
      finish: r.finish,
      loadCapacityKg: r.loadCapacityKg,
      isDoubleSided: r.isDoubleSided,
      baseShelfDepthMm: r.baseShelfDepthMm,
      baseCost: r.baseCost,
      active: r.active,
      imageMain: r.imageMain,
      compatibleStoreTypes: parsedTypes,
    };
  }
}
