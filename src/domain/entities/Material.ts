export type MaterialCategory = 'STEEL' | 'FINISH' | 'HARDWARE' | 'LABOUR' | 'LOGISTICS';
export type MaterialUnit = 'KG' | 'SQ_FT' | 'SQ_M' | 'PIECE' | 'RUNNING_FT' | 'JOB';

export interface MaterialRate {
  id: string;
  code: string;
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  currentRate: number; // in INR
  effectiveDate: Date;
  previousRate?: number;
  notes?: string | null;
}

export interface MaterialPriceAudit {
  materialId: string;
  previousRate: number;
  newRate: number;
  effectiveDate: Date;
  changedByAdminId?: string;
  changeReason?: string;
}
