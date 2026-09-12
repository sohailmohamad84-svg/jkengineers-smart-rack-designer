import { RackSpecification } from '../entities/Rack';

export interface IRackRepository {
  getAllActiveRacks(): Promise<RackSpecification[]>;
  getRackByCode(code: string): Promise<RackSpecification | null>;
  getRackById(id: string): Promise<RackSpecification | null>;
  getRacksForStoreType(storeTypeCode: string): Promise<RackSpecification[]>;
  upsertRack(rack: Partial<RackSpecification>): Promise<RackSpecification>;
}
