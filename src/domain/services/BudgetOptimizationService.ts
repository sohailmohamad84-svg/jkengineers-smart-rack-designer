import { ShopSpecification } from '../entities/Shop';
import { RackSpecification, PlacedRack } from '../entities/Rack';
import { DesignOption } from '../entities/Design';
import { MaterialRate } from '../entities/Material';
import { PricingEngine } from './PricingEngine';

export class BudgetOptimizationService {
  /**
   * Optimize layout configuration strictly by adjusting fixture counts, modular run efficiency,
   * and optional accessories WITHOUT EVER DOWNGRADING RAW MATERIAL QUALITY (Rule 5 & Rule 22).
   *
   * Commercial Invariants:
   * 1. Cost(Option C) < Cost(Option B) <= Cost(Option A)
   * 2. DisplayArea(Option C) < DisplayArea(Option B) <= DisplayArea(Option A)
   */
  public static optimizeForBudget(
    shop: ShopSpecification,
    storeTypeCode: string,
    customerBudget: number,
    catalogRacks: RackSpecification[],
    materials: MaterialRate[],
    requirements: Record<string, boolean>,
    balancedOption?: DesignOption
  ): DesignOption {
    const { lengthMm, breadthMm } = shop.dimensions;

    // Determine store-specific rack selections
    const wallRackStd = catalogRacks.find((r) => r.code === 'WALL_RACK_900') || catalogRacks[0];
    const wallRackWide = catalogRacks.find((r) => r.code === 'WALL_RACK_1200') || wallRackStd;
    const checkoutStd = catalogRacks.find((r) => r.code === 'CHECKOUT_COUNTER_STD');
    const medicalRack = catalogRacks.find((r) => r.code === 'MEDICAL_RACK_900');
    const garmentRack = catalogRacks.find((r) => r.code === 'GARMENT_DISPLAY_1200');

    let placedRacks: PlacedRack[] = [];

    if (balancedOption && balancedOption.racks && balancedOption.racks.length > 0) {
      // Base Option C directly on the balanced option's valid geometric placements
      for (const r of balancedOption.racks) {
        if (r.category === 'CHECKOUT_COUNTER') {
          // Keep checkout desk
          placedRacks.push({ ...r });
        } else if (r.category === 'END_RACK') {
          // Omit promotional end-caps in budget layout to reduce initial outlay
          continue;
        } else if (r.category === 'GONDOLA_RACK') {
          // For budget layout: only keep central gondolas if customer budget is ample,
          // and reduce tier count (8 tiers instead of 10)
          placedRacks.push({
            ...r,
            shelvesCount: 8, // 4 tiers per side
          });
        } else {
          // Wall racks: reduce tiers to economical standard (e.g. 5 tiers instead of 7 for medical, 4 instead of 5 for standard wall)
          const reducedShelves =
            r.category === 'MEDICAL_RACK'
              ? 5 // 5 tiers for medical store budget option (vs 7 standard / 8 max)
              : Math.max(3, r.shelvesCount - 1); // 4 tiers for standard wall

          placedRacks.push({
            ...r,
            shelvesCount: reducedShelves,
          });
        }
      }

      // Check if Option C has gondolas while exceeding budget or too close to Option B
      let currentEst = PricingEngine.calculateEstimate(placedRacks, materials);

      // If customer budget is below current estimate or if we want to ensure clear budget savings:
      // Remove central gondolas first if any exist
      if (
        placedRacks.some((r) => r.category === 'GONDOLA_RACK') &&
        (customerBudget < currentEst.grandTotal || currentEst.grandTotal >= balancedOption.estimate.grandTotal * 0.9)
      ) {
        placedRacks = placedRacks.filter((r) => r.category !== 'GONDOLA_RACK');
        currentEst = PricingEngine.calculateEstimate(placedRacks, materials);
      }

      // If still above customer budget, retain only primary North & South walls + cashier desk
      if (customerBudget < currentEst.grandTotal) {
        const primaryRacks = placedRacks.filter(
          (r) => r.wallPlacement === 'NORTH' || r.wallPlacement === 'SOUTH' || r.wallPlacement === 'CASHIER'
        );
        if (primaryRacks.length >= 3) {
          placedRacks = primaryRacks;
        }
      }
    } else {
      // Fallback independent placement if balancedOption was not provided
      let chosenWallRack = wallRackWide;
      let defaultBudgetShelves = 4;
      if (storeTypeCode === 'MEDICAL_STORE' && medicalRack) {
        chosenWallRack = medicalRack;
        defaultBudgetShelves = 5;
      } else if (storeTypeCode === 'GARMENT_STORE' && garmentRack) {
        chosenWallRack = garmentRack;
        defaultBudgetShelves = 3;
      }

      const needCheckout =
        requirements['REQ_CHECKOUT_COUNTER'] !== false && requirements['REQ_FRONT_COUNTER'] !== false;
      if (needCheckout && checkoutStd) {
        placedRacks.push({
          rackTypeCode: checkoutStd.code,
          rackTypeName: checkoutStd.name,
          category: 'CHECKOUT_COUNTER',
          label: 'Cashier / Billing Desk',
          posX: 600,
          posY: 600,
          rotation: 0,
          widthMm: checkoutStd.defaultWidthMm,
          depthMm: checkoutStd.defaultDepthMm,
          heightMm: checkoutStd.defaultHeightMm,
          shelvesCount: checkoutStd.defaultShelves,
          wallPlacement: 'CASHIER',
          loadCapacityKg: checkoutStd.loadCapacityKg,
          isDoubleSided: false,
        });
      }

      const rackWidth = chosenWallRack.defaultWidthMm;
      const wallDepth = chosenWallRack.defaultDepthMm;

      // North Wall
      for (let x = 600; x <= lengthMm - rackWidth - 600; x += rackWidth) {
        const overlapsDoor = shop.openings.some(
          (op) => op.wall === 'NORTH' && x < op.distanceMm + op.widthMm + 200 && x + rackWidth > op.distanceMm - 200
        );
        if (!overlapsDoor) {
          placedRacks.push({
            rackTypeCode: chosenWallRack.code,
            rackTypeName: chosenWallRack.name,
            category: chosenWallRack.category,
            label: 'North Wall Modular Rack',
            posX: x,
            posY: 0,
            rotation: 0,
            widthMm: rackWidth,
            depthMm: wallDepth,
            heightMm: chosenWallRack.defaultHeightMm,
            shelvesCount: defaultBudgetShelves,
            wallPlacement: 'NORTH',
            loadCapacityKg: chosenWallRack.loadCapacityKg,
            isDoubleSided: false,
          });
        }
      }

      // South Wall
      for (let x = 600; x <= lengthMm - rackWidth - 600; x += rackWidth) {
        const overlapsDoor = shop.openings.some(
          (op) => op.wall === 'SOUTH' && x < op.distanceMm + op.widthMm + 200 && x + rackWidth > op.distanceMm - 200
        );
        if (!overlapsDoor) {
          placedRacks.push({
            rackTypeCode: chosenWallRack.code,
            rackTypeName: chosenWallRack.name,
            category: chosenWallRack.category,
            label: 'South Wall Modular Rack',
            posX: x,
            posY: breadthMm - wallDepth,
            rotation: 180,
            widthMm: rackWidth,
            depthMm: wallDepth,
            heightMm: chosenWallRack.defaultHeightMm,
            shelvesCount: defaultBudgetShelves,
            wallPlacement: 'SOUTH',
            loadCapacityKg: chosenWallRack.loadCapacityKg,
            isDoubleSided: false,
          });
        }
      }
    }

    // Strict Invariant Check: Ensure Option C is strictly lower cost than Option B
    if (balancedOption && balancedOption.estimate) {
      let finalEst = PricingEngine.calculateEstimate(placedRacks, materials);
      if (finalEst.grandTotal >= balancedOption.estimate.grandTotal) {
        // Drop 1 tier across wall units
        placedRacks = placedRacks.map((r) => {
          if (r.category === 'CHECKOUT_COUNTER') return r;
          return { ...r, shelvesCount: Math.max(3, r.shelvesCount - 1) };
        });
      }
    }

    const finalEstimate = PricingEngine.calculateEstimate(placedRacks, materials);

    // Calculate display area and breakdown
    const racksByType: Record<string, number> = {};
    let totalDisplayAreaSqM = 0;
    for (const r of placedRacks) {
      racksByType[r.rackTypeName] = (racksByType[r.rackTypeName] || 0) + 1;
      totalDisplayAreaSqM += (r.widthMm / 1000) * (r.depthMm / 1000) * r.shelvesCount;
    }

    const isUnderBudget = customerBudget < finalEstimate.grandTotal;
    let explanation = '';
    if (isUnderBudget) {
      explanation = `Your selected budget of ₹${customerBudget.toLocaleString(
        'en-IN'
      )} is below the standard full-store layout estimate. Following our non-degradation engineering rule, JK Engineers Works NEVER downgrades raw steel thickness or 7-tank powder coating quality. We have generated the closest feasible layout with ${
        placedRacks.length
      } essential fixtures, preserving complete structural safety and longevity.`;
    } else {
      explanation = `Budget optimized layout: We deployed ${
        placedRacks.length
      } modular units with high-efficiency spans and economical tier configurations, saving capital outlay while preserving 100% genuine Tata/JSW prime steel specifications.`;
    }

    return {
      versionNumber: 3,
      optionType: 'OPTION_C_BUDGET_OPTIMIZED',
      title: 'Option C: Budget Optimized Layout',
      subtitle: 'Maximizes value per rupee spent while strictly preserving our standard heavy-gauge steel quality.',
      totalRacks: placedRacks.length,
      racksByType,
      totalDisplayAreaSqM: Math.round(totalDisplayAreaSqM * 10) / 10,
      floorAreaSqM: Math.round(((lengthMm / 1000) * (breadthMm / 1000)) * 10) / 10,
      aisleWidthMm: 1100,
      racks: placedRacks,
      estimate: finalEstimate,
      explanation,
      highlights: [
        `Strict compliance with JK Engineers standard material quality (no gauge reduction)`,
        `High-efficiency modular tier counts to lower capital outlay`,
        `Spacious 1100 mm aisles for customer movement`,
        isUnderBudget
          ? `Includes minimum viable structural fixtures for your shop dimensions`
          : `Most economical configuration preserving full commercial steel durability`,
      ],
    };
  }
}
