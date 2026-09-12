import { ShopSpecification } from '../entities/Shop';
import { PlacedRack } from '../entities/Rack';

export interface AIStoreInsight {
  score: number; // 0 to 100 layout quality score
  customerFlowType: 'LOOP' | 'GRID' | 'FREE_FLOW';
  spaceUtilizationPercentage: number;
  naturalLanguageSummary: string;
  merchandisingTips: string[];
  suggestedAddons: string[];
}

export interface IAIRecommendationService {
  /**
   * Analyze spatial layout and generate natural-language merchandising insights
   */
  generateLayoutInsights(
    shop: ShopSpecification,
    storeTypeCode: string,
    placedRacks: PlacedRack[]
  ): Promise<AIStoreInsight>;

  /**
   * Parse conversational customer input into structured shop requirements
   */
  parseNaturalLanguageRequirements(prompt: string): Promise<Record<string, any>>;
}
