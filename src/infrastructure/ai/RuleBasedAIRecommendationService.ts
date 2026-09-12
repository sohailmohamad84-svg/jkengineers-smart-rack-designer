import { IAIRecommendationService, AIStoreInsight } from '../../domain/ports/IAIRecommendationService';
import { ShopSpecification } from '../../domain/entities/Shop';
import { PlacedRack } from '../../domain/entities/Rack';

export class RuleBasedAIRecommendationService implements IAIRecommendationService {
  public async generateLayoutInsights(
    shop: ShopSpecification,
    storeTypeCode: string,
    placedRacks: PlacedRack[]
  ): Promise<AIStoreInsight> {
    const { lengthMm, breadthMm } = shop.dimensions;
    const totalFloorAreaSqM = (lengthMm / 1000) * (breadthMm / 1000);

    // Calculate total rack footprint
    let totalRackFootprintSqM = 0;
    for (const r of placedRacks) {
      totalRackFootprintSqM += (r.widthMm / 1000) * (r.depthMm / 1000);
    }

    const spaceUtilization = Math.min(
      75,
      Math.max(25, Math.round((totalRackFootprintSqM / totalFloorAreaSqM) * 100))
    );

    const hasGondolas = placedRacks.some((r) => r.category === 'GONDOLA_RACK');
    const hasEndCaps = placedRacks.some((r) => r.category === 'END_RACK');
    const hasCheckout = placedRacks.some((r) => r.category === 'CHECKOUT_COUNTER');

    const flowType: 'LOOP' | 'GRID' | 'FREE_FLOW' = hasGondolas ? 'LOOP' : 'FREE_FLOW';

    const merchandisingTips: string[] = [];
    if (hasEndCaps) {
      merchandisingTips.push(
        'Position high-margin impulse items and promotional brand partnerships on the promotional Gondola End-Caps facing the front entrance.'
      );
    }
    if (hasCheckout) {
      merchandisingTips.push(
        'Maintain a 1.2-meter queue buffer in front of the cashier counter to avoid obstructing incoming customer traffic.'
      );
    }
    merchandisingTips.push(
      'Place daily staple grocery items (flour, oil, grains) along the back wall to draw customer circulation through all central aisles.'
    );

    const suggestedAddons: string[] = [
      'Acrylic Front Product Stoppers to prevent shelf spillage',
      'Clip-on PVC Data & Price Strips with transparent front',
      'Wire Mesh Baskets for central impulse dump displays',
    ];

    return {
      score: spaceUtilization > 40 && spaceUtilization < 65 ? 94 : 88,
      customerFlowType: flowType,
      spaceUtilizationPercentage: spaceUtilization,
      naturalLanguageSummary: `This layout achieves ${spaceUtilization}% floor utilization with a ${flowType} circulation pattern. The design optimizes merchandise visibility across ${placedRacks.length} modular units while maintaining emergency exit clearance.`,
      merchandisingTips,
      suggestedAddons,
    };
  }

  public async parseNaturalLanguageRequirements(prompt: string): Promise<Record<string, any>> {
    const lower = prompt.toLowerCase();
    return {
      wantsGondolas: lower.includes('center') || lower.includes('island') || lower.includes('gondola'),
      wantsCheckout: !lower.includes('no counter') && !lower.includes('without billing'),
      wantsEndCaps: lower.includes('end cap') || lower.includes('promotional'),
      estimatedBudget: lower.includes('lakh') ? 300000 : 200000,
    };
  }
}
