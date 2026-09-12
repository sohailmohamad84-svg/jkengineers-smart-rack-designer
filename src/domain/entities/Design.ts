import { PlacedRack } from './Rack';
import { CostEstimate } from './Estimate';

export type DesignOptionType =
  | 'OPTION_A_MAX_DISPLAY'
  | 'OPTION_B_BALANCED'
  | 'OPTION_C_BUDGET_OPTIMIZED';

export interface DesignOption {
  id?: string;
  versionNumber: number;
  optionType: DesignOptionType;
  title: string;
  subtitle: string;
  totalRacks: number;
  racksByType: Record<string, number>;
  totalDisplayAreaSqM: number;
  floorAreaSqM: number;
  aisleWidthMm: number;
  racks: PlacedRack[];
  estimate: CostEstimate;
  explanation: string;
  highlights: string[];
}

export interface StoreLayoutResult {
  projectId: string;
  storeTypeCode: string;
  options: DesignOption[];
  activeOptionType: DesignOptionType;
}
