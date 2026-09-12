import { MaterialRate, MaterialPriceAudit } from '../entities/Material';

export interface IMaterialRepository {
  getAllActiveMaterials(): Promise<MaterialRate[]>;
  getMaterialByCode(code: string): Promise<MaterialRate | null>;
  updateMaterialPrice(audit: MaterialPriceAudit): Promise<MaterialRate>;
  getPriceHistoryForMaterial(materialId: string): Promise<any[]>;
}
