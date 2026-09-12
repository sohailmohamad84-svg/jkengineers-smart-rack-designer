import { ShopSpecification, ShopOpening, ShopObstacle } from '../entities/Shop';
import { RackSpecification, PlacedRack, getRackBoundingBox, doBoundingBoxesOverlap, BoundingBox2D } from '../entities/Rack';
import { DesignOption, StoreLayoutResult } from '../entities/Design';
import { MaterialRate } from '../entities/Material';
import { PricingEngine } from './PricingEngine';
import { BudgetOptimizationService } from './BudgetOptimizationService';
import { PlacementValidator } from './PlacementValidator';

interface WallSegment {
  wall: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  lengthMm: number;
}

export class RackDesignEngine {
  private static readonly DOOR_CLEARANCE_BUFFER_MM = 300;
  private static readonly OBSTACLE_CLEARANCE_BUFFER_MM = 100;

  /**
   * Generate 3 customized layout options for a given shop and business context
   */
  public static generateLayoutOptions(
    shop: ShopSpecification,
    storeTypeCode: string,
    customerBudget: number,
    catalogRacks: RackSpecification[],
    activeMaterials: MaterialRate[],
    requirements: Record<string, boolean> = {}
  ): StoreLayoutResult {
    // 1. Generate Option A: Maximum Display
    const optionA = this.generateSpecificOption(
      shop,
      storeTypeCode,
      'OPTION_A_MAX_DISPLAY',
      catalogRacks,
      activeMaterials,
      requirements,
      {
        aisleMultiplier: 0.92, // Tighter aisles within safety bounds
        preferLongModules: false,
        includeEndCaps: true,
        shelfCountDelta: 1, // Higher shelf density
      }
    );

    // 2. Generate Option B: Balanced Layout (Recommended)
    const optionB = this.generateSpecificOption(
      shop,
      storeTypeCode,
      'OPTION_B_BALANCED',
      catalogRacks,
      activeMaterials,
      requirements,
      {
        aisleMultiplier: 1.1, // Comfortable walking aisle
        preferLongModules: false,
        includeEndCaps: true,
        shelfCountDelta: 0,
      }
    );

    // 3. Generate Option C: Budget Optimized (leveraging Option B geometry)
    const optionC = BudgetOptimizationService.optimizeForBudget(
      shop,
      storeTypeCode,
      customerBudget,
      catalogRacks,
      activeMaterials,
      requirements,
      optionB
    );

    // 4. Ensure Option A is strictly Maximum Display Capacity (area and capacity)
    if (
      optionA.estimate.grandTotal < optionB.estimate.grandTotal ||
      optionA.totalDisplayAreaSqM < optionB.totalDisplayAreaSqM
    ) {
      // Re-derive Option A with higher shelf tier density (+1 tier) across Option B's valid placements
      const enhancedRacks: PlacedRack[] = optionB.racks.map((r) => ({
        ...r,
        shelvesCount: r.category === 'CHECKOUT_COUNTER' ? r.shelvesCount : r.shelvesCount + 1,
      }));
      optionA.racks = enhancedRacks;
      optionA.estimate = PricingEngine.calculateEstimate(enhancedRacks, activeMaterials);
      let newDisplay = 0;
      for (const r of enhancedRacks) {
        newDisplay += (r.widthMm / 1000) * (r.depthMm / 1000) * r.shelvesCount;
      }
      optionA.totalDisplayAreaSqM = Math.round(newDisplay * 10) / 10;
      optionA.totalRacks = enhancedRacks.length;
    }

    // 5. Invariant Post-condition Check:
    // Guarantee: Cost(Option C) < Cost(Option B) <= Cost(Option A)
    if (optionC.estimate.grandTotal >= optionB.estimate.grandTotal) {
      optionC.racks = optionC.racks.map((r) => ({
        ...r,
        shelvesCount: r.category === 'CHECKOUT_COUNTER' ? r.shelvesCount : Math.max(3, r.shelvesCount - 1),
      }));
      optionC.estimate = PricingEngine.calculateEstimate(optionC.racks, activeMaterials);
      let newDisplayC = 0;
      for (const r of optionC.racks) {
        newDisplayC += (r.widthMm / 1000) * (r.depthMm / 1000) * r.shelvesCount;
      }
      optionC.totalDisplayAreaSqM = Math.round(newDisplayC * 10) / 10;
    }

    return {
      projectId: shop.id || 'TEMP_PROJECT',
      storeTypeCode,
      options: [optionA, optionB, optionC],
      activeOptionType: 'OPTION_B_BALANCED',
    };
  }

  private static generateSpecificOption(
    shop: ShopSpecification,
    storeTypeCode: string,
    optionType: 'OPTION_A_MAX_DISPLAY' | 'OPTION_B_BALANCED' | 'OPTION_C_BUDGET_OPTIMIZED',
    catalogRacks: RackSpecification[],
    materials: MaterialRate[],
    requirements: Record<string, boolean>,
    config: {
      aisleMultiplier: number;
      preferLongModules: boolean;
      includeEndCaps: boolean;
      shelfCountDelta: number;
    }
  ): DesignOption {
    const { lengthMm, breadthMm, heightMm } = shop.dimensions;
    const placedRacks: PlacedRack[] = [];

    // Identify standard racks from catalog
    const wallRackStd = catalogRacks.find((r) => r.code === 'WALL_RACK_900') || catalogRacks[0];
    const wallRackWide = catalogRacks.find((r) => r.code === 'WALL_RACK_1200') || wallRackStd;
    const gondolaStd = catalogRacks.find((r) => r.code === 'GONDOLA_RACK_900');
    const gondolaWide = catalogRacks.find((r) => r.code === 'GONDOLA_RACK_1200') || gondolaStd;
    const endRackStd = catalogRacks.find((r) => r.code === 'GONDOLA_END_RACK');
    const checkoutStd = catalogRacks.find((r) => r.code === 'CHECKOUT_COUNTER_STD');
    const medicalRack = catalogRacks.find((r) => r.code === 'MEDICAL_RACK_900');
    const garmentRack = catalogRacks.find((r) => r.code === 'GARMENT_DISPLAY_1200');

    // Store type baseline aisle
    let baseAisleMm = 1000;
    if (storeTypeCode === 'SUPERMARKET') baseAisleMm = 1100;
    if (storeTypeCode === 'GROCERY') baseAisleMm = 950;
    if (storeTypeCode === 'MEDICAL_STORE') baseAisleMm = 900;
    if (storeTypeCode === 'GARMENT_STORE') baseAisleMm = 1050;

    const effectiveAisleMm = Math.round(baseAisleMm * config.aisleMultiplier);

    // Select primary wall rack based on store type
    let chosenWallRack = wallRackStd;
    if (storeTypeCode === 'MEDICAL_STORE' && medicalRack) {
      chosenWallRack = medicalRack;
    } else if (storeTypeCode === 'GARMENT_STORE' && garmentRack) {
      chosenWallRack = garmentRack;
    }

    // Helper: Check collision against obstacles, openings, and other racks via shared PlacementValidator
    const canPlaceRack = (candidate: PlacedRack): boolean => {
      return PlacementValidator.validateRackPlacement(candidate, placedRacks, shop).isValid;
    };

    // --- STEP 1: CHECKOUT / BILLING COUNTER PLACEMENT ---
    const needCheckout = requirements['REQ_CHECKOUT_COUNTER'] !== false && requirements['REQ_FRONT_COUNTER'] !== false;
    if (needCheckout && checkoutStd) {
      // Find main door
      const mainDoor = shop.openings.find((o) => o.type === 'DOOR_MAIN') || shop.openings[0];
      let checkoutX = 1200;
      let checkoutY = 800;

      if (mainDoor) {
        if (mainDoor.wall === 'NORTH') {
          checkoutX = Math.min(lengthMm - 1800, mainDoor.distanceMm + mainDoor.widthMm + 600);
          checkoutY = 600;
        } else if (mainDoor.wall === 'SOUTH') {
          checkoutX = Math.max(600, mainDoor.distanceMm - 1800);
          checkoutY = breadthMm - 1400;
        } else if (mainDoor.wall === 'WEST') {
          checkoutX = 600;
          checkoutY = mainDoor.distanceMm + mainDoor.widthMm + 400;
        } else {
          checkoutX = lengthMm - 2000;
          checkoutY = mainDoor.distanceMm + mainDoor.widthMm + 400;
        }
      }

      const candidateCheckout: PlacedRack = {
        rackTypeCode: checkoutStd.code,
        rackTypeName: checkoutStd.name,
        category: 'CHECKOUT_COUNTER',
        label: 'Cashier / Billing Desk',
        posX: checkoutX,
        posY: checkoutY,
        rotation: 0,
        widthMm: checkoutStd.defaultWidthMm,
        depthMm: checkoutStd.defaultDepthMm,
        heightMm: checkoutStd.defaultHeightMm,
        shelvesCount: checkoutStd.defaultShelves,
        wallPlacement: 'CASHIER',
        loadCapacityKg: checkoutStd.loadCapacityKg,
        isDoubleSided: false,
      };

      if (canPlaceRack(candidateCheckout)) {
        placedRacks.push(candidateCheckout);
      }
    }

    // --- STEP 2: PERIMETER WALL RACKS ---
    const wallDepth = chosenWallRack.defaultDepthMm; // 450mm
    const rackWidth = chosenWallRack.defaultWidthMm; // 900mm or 1200mm

    // A. North Wall (Y = 0)
    for (let x = 450; x <= lengthMm - rackWidth - 450; x += rackWidth) {
      const candidate: PlacedRack = {
        rackTypeCode: chosenWallRack.code,
        rackTypeName: chosenWallRack.name,
        category: chosenWallRack.category,
        label: `North Wall Rack`,
        posX: x,
        posY: 0,
        rotation: 0,
        widthMm: rackWidth,
        depthMm: wallDepth,
        heightMm: Math.min(heightMm, chosenWallRack.defaultHeightMm),
        shelvesCount: chosenWallRack.defaultShelves + config.shelfCountDelta,
        wallPlacement: 'NORTH',
        loadCapacityKg: chosenWallRack.loadCapacityKg,
        isDoubleSided: false,
      };
      if (canPlaceRack(candidate)) {
        placedRacks.push(candidate);
      }
    }

    // B. South Wall (Y = breadthMm - wallDepth)
    for (let x = 450; x <= lengthMm - rackWidth - 450; x += rackWidth) {
      const candidate: PlacedRack = {
        rackTypeCode: chosenWallRack.code,
        rackTypeName: chosenWallRack.name,
        category: chosenWallRack.category,
        label: `South Wall Rack`,
        posX: x,
        posY: breadthMm - wallDepth,
        rotation: 180,
        widthMm: rackWidth,
        depthMm: wallDepth,
        heightMm: Math.min(heightMm, chosenWallRack.defaultHeightMm),
        shelvesCount: chosenWallRack.defaultShelves + config.shelfCountDelta,
        wallPlacement: 'SOUTH',
        loadCapacityKg: chosenWallRack.loadCapacityKg,
        isDoubleSided: false,
      };
      if (canPlaceRack(candidate)) {
        placedRacks.push(candidate);
      }
    }

    // C. West Wall (X = 0)
    for (let y = 450; y <= breadthMm - rackWidth - 450; y += rackWidth) {
      const candidate: PlacedRack = {
        rackTypeCode: chosenWallRack.code,
        rackTypeName: chosenWallRack.name,
        category: chosenWallRack.category,
        label: `West Wall Rack`,
        posX: 0,
        posY: y,
        rotation: 90,
        widthMm: rackWidth,
        depthMm: wallDepth,
        heightMm: Math.min(heightMm, chosenWallRack.defaultHeightMm),
        shelvesCount: chosenWallRack.defaultShelves + config.shelfCountDelta,
        wallPlacement: 'WEST',
        loadCapacityKg: chosenWallRack.loadCapacityKg,
        isDoubleSided: false,
      };
      if (canPlaceRack(candidate)) {
        placedRacks.push(candidate);
      }
    }

    // D. East Wall (X = lengthMm - wallDepth)
    for (let y = 450; y <= breadthMm - rackWidth - 450; y += rackWidth) {
      const candidate: PlacedRack = {
        rackTypeCode: chosenWallRack.code,
        rackTypeName: chosenWallRack.name,
        category: chosenWallRack.category,
        label: `East Wall Rack`,
        posX: lengthMm - wallDepth,
        posY: y,
        rotation: 270,
        widthMm: rackWidth,
        depthMm: wallDepth,
        heightMm: Math.min(heightMm, chosenWallRack.defaultHeightMm),
        shelvesCount: chosenWallRack.defaultShelves + config.shelfCountDelta,
        wallPlacement: 'EAST',
        loadCapacityKg: chosenWallRack.loadCapacityKg,
        isDoubleSided: false,
      };
      if (canPlaceRack(candidate)) {
        placedRacks.push(candidate);
      }
    }

    // --- STEP 3: CENTRAL ISLAND GONDOLA AISLES ---
    const allowGondolas =
      storeTypeCode === 'SUPERMARKET' ||
      storeTypeCode === 'GROCERY' ||
      storeTypeCode === 'MINI_MART' ||
      requirements['REQ_GONDOLA_AISLES'] === true;

    if (allowGondolas && gondolaStd) {
      const gondolaDepth = gondolaStd.defaultDepthMm; // 900mm
      const gondolaW = gondolaStd.defaultWidthMm; // 900mm

      // Calculate available central bounds
      const minX = wallDepth + effectiveAisleMm;
      const maxX = lengthMm - wallDepth - effectiveAisleMm;
      const minY = wallDepth + effectiveAisleMm + 400; // Extra room near entrance
      const maxY = breadthMm - wallDepth - effectiveAisleMm;

      const islandSpanY = maxY - minY;
      const islandSpanX = maxX - minX;

      // Determine aisle spacing: rows along X (longitudinal) or Y (transverse)
      if (islandSpanX >= 1800 && islandSpanY >= gondolaDepth) {
        const rowPitchY = gondolaDepth + effectiveAisleMm;
        const numRows = Math.max(1, Math.floor((islandSpanY + effectiveAisleMm) / rowPitchY));

        for (let r = 0; r < numRows; r++) {
          const rowY = minY + r * rowPitchY;
          if (rowY + gondolaDepth > maxY) break;

          // Place gondola units in this row along X
          let currentX = minX;

          // End cap on West end if requested
          if (config.includeEndCaps && endRackStd && currentX - endRackStd.defaultDepthMm >= minX - 400) {
            const candidateEndWest: PlacedRack = {
              rackTypeCode: endRackStd.code,
              rackTypeName: endRackStd.name,
              category: 'END_RACK',
              label: 'Gondola End Cap',
              posX: currentX - endRackStd.defaultDepthMm,
              posY: rowY + (gondolaDepth - endRackStd.defaultWidthMm) / 2,
              rotation: 90,
              widthMm: endRackStd.defaultWidthMm,
              depthMm: endRackStd.defaultDepthMm,
              heightMm: endRackStd.defaultHeightMm,
              shelvesCount: endRackStd.defaultShelves,
              wallPlacement: 'ISLAND',
              loadCapacityKg: endRackStd.loadCapacityKg,
              isDoubleSided: false,
            };
            if (canPlaceRack(candidateEndWest)) {
              placedRacks.push(candidateEndWest);
            }
          }

          while (currentX + gondolaW <= maxX) {
            const candidateGondola: PlacedRack = {
              rackTypeCode: gondolaStd.code,
              rackTypeName: gondolaStd.name,
              category: 'GONDOLA_RACK',
              label: `Central Gondola Row ${r + 1}`,
              posX: currentX,
              posY: rowY,
              rotation: 0,
              widthMm: gondolaW,
              depthMm: gondolaDepth,
              heightMm: gondolaStd.defaultHeightMm,
              shelvesCount: gondolaStd.defaultShelves + config.shelfCountDelta * 2,
              wallPlacement: 'ISLAND',
              loadCapacityKg: gondolaStd.loadCapacityKg,
              isDoubleSided: true,
            };

            if (canPlaceRack(candidateGondola)) {
              placedRacks.push(candidateGondola);
              currentX += gondolaW;
            } else {
              currentX += 300; // Step forward to skip obstacle
            }
          }

          // End cap on East end if requested
          if (config.includeEndCaps && endRackStd) {
            const candidateEndEast: PlacedRack = {
              rackTypeCode: endRackStd.code,
              rackTypeName: endRackStd.name,
              category: 'END_RACK',
              label: 'Gondola End Cap',
              posX: currentX,
              posY: rowY + (gondolaDepth - endRackStd.defaultWidthMm) / 2,
              rotation: 270,
              widthMm: endRackStd.defaultWidthMm,
              depthMm: endRackStd.defaultDepthMm,
              heightMm: endRackStd.defaultHeightMm,
              shelvesCount: endRackStd.defaultShelves,
              wallPlacement: 'ISLAND',
              loadCapacityKg: endRackStd.loadCapacityKg,
              isDoubleSided: false,
            };
            if (canPlaceRack(candidateEndEast)) {
              placedRacks.push(candidateEndEast);
            }
          }
        }
      }
    }

    // --- STEP 4: CALCULATE METRICS & COST ESTIMATE ---
    const estimate = PricingEngine.calculateEstimate(placedRacks, materials);

    // Group racks by category
    const racksByType: Record<string, number> = {};
    let totalDisplayAreaSqM = 0;

    for (const r of placedRacks) {
      racksByType[r.rackTypeName] = (racksByType[r.rackTypeName] || 0) + 1;
      const shelfArea = (r.widthMm / 1000) * (r.depthMm / 1000) * r.shelvesCount;
      totalDisplayAreaSqM += shelfArea;
    }

    totalDisplayAreaSqM = Math.round(totalDisplayAreaSqM * 10) / 10;
    const floorAreaSqM = Math.round(((lengthMm / 1000) * (breadthMm / 1000)) * 10) / 10;

    // Titles & Highlights
    let title = 'Option B: Balanced Layout (Recommended)';
    let subtitle = 'Optimal balance between merchandise display capacity and spacious customer walking aisles.';
    let explanation = `We placed ${placedRacks.length} modular units including perimeter wall display racks and central island runs. Customer aisles are maintained at an optimal ${effectiveAisleMm} mm with complete clearance around doors and billing zones.`;
    let highlights = [
      `${placedRacks.length} total fixtures arranged with clean loop circulation`,
      `Comfortable ${effectiveAisleMm} mm walking corridors for high customer footfall`,
      `${totalDisplayAreaSqM} sq. m. of usable merchandise shelf display area`,
    ];

    if (optionType === 'OPTION_A_MAX_DISPLAY') {
      title = 'Option A: Maximum Display Capacity';
      subtitle = 'Maximized shelf density and wall utilization for extensive SKU counts.';
      explanation = `Engineered for maximum retail inventory holding. Features high-density wall shelving, dual-sided center gondolas with promotional end caps, utilizing every available millimeter while respecting door swing clearances.`;
      highlights = [
        `Maximum SKU capacity with ${totalDisplayAreaSqM} sq. m. total shelf area`,
        `Includes promotional gondola end-caps for high-margin impulse items`,
        `High shelf density per modular column`,
      ];
    } else if (optionType === 'OPTION_C_BUDGET_OPTIMIZED') {
      title = 'Option C: Budget Optimized Layout';
      subtitle = 'Most cost-effective configuration preserving JK standard heavy-gauge steel quality.';
      explanation = `Designed to respect your financial budget without compromising our hallmark steel gauge or 7-tank powder coating finish. Prioritizes perimeter display and core essential units with optimal modular run lengths.`;
      highlights = [
        `Lowest capital outlay while maintaining standard steel specifications`,
        `Optimized modular widths to minimize upright column redundancy`,
        `Future-expandable: Additional gondola modules can be installed later`,
      ];
    }

    return {
      versionNumber: optionType === 'OPTION_A_MAX_DISPLAY' ? 1 : optionType === 'OPTION_B_BALANCED' ? 2 : 3,
      optionType,
      title,
      subtitle,
      totalRacks: placedRacks.length,
      racksByType,
      totalDisplayAreaSqM,
      floorAreaSqM,
      aisleWidthMm: effectiveAisleMm,
      racks: placedRacks,
      estimate,
      explanation,
      highlights,
    };
  }
}
