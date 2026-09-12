export type EstimateItemType =
  | 'MATERIAL'
  | 'FABRICATION'
  | 'FINISH'
  | 'HARDWARE'
  | 'LABOR'
  | 'INSTALLATION'
  | 'LOGISTICS'
  | 'TAX';

export interface EstimateLineItem {
  id?: string;
  itemType: EstimateItemType;
  description: string;
  quantity: number;
  unit: string;
  unitRate: number;
  totalAmount: number;
}

export interface CostEstimate {
  id?: string;
  totalMaterialCost: number;
  totalFabricationCost: number;
  totalPowderCoatingCost: number;
  totalLaborCost: number;
  totalInstallationCost: number;
  totalTransportationCost: number;
  subTotal: number;
  totalGstCost: number;
  grandTotal: number;
  minRange: number;
  maxRange: number;
  isIndicative: boolean;
  disclaimer: string;
  items: EstimateLineItem[];
  createdAt: Date;
}
