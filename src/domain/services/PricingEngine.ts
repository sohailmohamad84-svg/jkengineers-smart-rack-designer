import { PlacedRack } from '../entities/Rack';
import { MaterialRate } from '../entities/Material';
import { CostEstimate, EstimateLineItem } from '../entities/Estimate';

export class PricingEngine {
  private static readonly GST_RATE = 0.18; // 18% GST

  /**
   * Calculate complete itemized Bill of Materials (BOM) and total estimated project cost
   */
  public static calculateEstimate(
    racks: PlacedRack[],
    materials: MaterialRate[],
    includeInstallation: boolean = true
  ): CostEstimate {
    const rateMap = new Map<string, number>();
    for (const mat of materials) {
      rateMap.set(mat.code, mat.currentRate);
    }

    const msSheetRate = rateMap.get('MS_SHEET_CRCA') || 85.0;
    const msAngleRate = rateMap.get('MS_SLOTTED_ANGLE') || 92.0;
    const msPipeRate = rateMap.get('MS_ERW_PIPE') || 96.0;
    const powderCoatRate = rateMap.get('POWDER_COATING') || 45.0;
    const bracketRate = rateMap.get('BRACKET_HEAVY') || 85.0;
    const hardwareRate = rateMap.get('FASTENERS_HARDWARE') || 18.0;
    const fabricationRate = rateMap.get('FABRICATION_LABOR') || 650.0;
    const installRate = rateMap.get('INSTALLATION_LABOR') || 450.0;
    const transportRate = rateMap.get('LOCAL_TRANSPORTATION') || 3500.0;

    let totalSheetWeightKg = 0;
    let totalStructuralSteelKg = 0;
    let totalPowderCoatSqM = 0;
    let totalBracketsCount = 0;
    let totalHardwareKits = racks.length;
    let totalFabricationJobs = racks.length;
    let totalInstallationJobs = includeInstallation ? racks.length : 0;

    for (const rack of racks) {
      const isCheckout = rack.category === 'CHECKOUT_COUNTER';
      const isDouble = rack.isDoubleSided;
      const shelves = rack.shelvesCount;

      // Steel weight estimation based on real industrial sheet metal gauges (1.0mm - 1.2mm CRCA)
      // Shelf tray area (sq meters)
      const shelfAreaPerTierSqM = (rack.widthMm / 1000) * (rack.depthMm / 1000);
      const shelfWeightPerTierKg = shelfAreaPerTierSqM * 11.5; // ~11.5 kg per sqm including side channels & stiffener
      const rackSheetWeight = shelves * shelfWeightPerTierKg;
      totalSheetWeightKg += rackSheetWeight;

      // Upright columns & frame
      const uprightHeightM = rack.heightMm / 1000;
      const uprightWeightKg = isDouble
        ? uprightHeightM * 2 * 4.8 // Double-sided ERW pipe column
        : uprightHeightM * 2 * 3.5; // Single-sided slotted angle column
      totalStructuralSteelKg += uprightWeightKg;

      // Brackets: 2 per tier (except base shelf which sits on bottom foot)
      const activeBrackets = Math.max(0, (shelves - 1) * 2);
      totalBracketsCount += isDouble ? activeBrackets * 2 : activeBrackets;

      // Powder coating surface area (both sides of sheet + uprights)
      const totalSurfaceSqM = (shelfAreaPerTierSqM * shelves * 2.2) + (uprightHeightM * 0.8);
      totalPowderCoatSqM += totalSurfaceSqM;

      if (isCheckout) {
        totalSheetWeightKg += 45; // Stainless/CRCA top & cash drawer body
        totalStructuralSteelKg += 25; // Internal frame
        totalPowderCoatSqM += 12;
      }
    }

    // Round quantities
    totalSheetWeightKg = Math.round(totalSheetWeightKg * 10) / 10;
    totalStructuralSteelKg = Math.round(totalStructuralSteelKg * 10) / 10;
    totalPowderCoatSqM = Math.round(totalPowderCoatSqM * 10) / 10;

    // Line items
    const items: EstimateLineItem[] = [];

    // 1. Sheet Metal
    const sheetCost = Math.round(totalSheetWeightKg * msSheetRate);
    items.push({
      itemType: 'MATERIAL',
      description: 'CRCA Prime Steel Sheet Trays & Shelves (1.2mm/1.0mm with Stiffener Ribs)',
      quantity: totalSheetWeightKg,
      unit: 'KG',
      unitRate: msSheetRate,
      totalAmount: sheetCost,
    });

    // 2. Structural Steel
    const structuralCost = Math.round(totalStructuralSteelKg * (msAngleRate + msPipeRate) / 2);
    items.push({
      itemType: 'MATERIAL',
      description: 'Structural MS Upright Columns, Base Feet & Bracing Sections',
      quantity: totalStructuralSteelKg,
      unit: 'KG',
      unitRate: Math.round((msAngleRate + msPipeRate) / 2),
      totalAmount: structuralCost,
    });

    // 3. Brackets
    const bracketCost = totalBracketsCount * bracketRate;
    items.push({
      itemType: 'HARDWARE',
      description: 'Heavy-Duty Press-Formed Multi-Angle Cantilever Brackets',
      quantity: totalBracketsCount,
      unit: 'PIECE',
      unitRate: bracketRate,
      totalAmount: bracketCost,
    });

    // 4. Leveling & Hardware Kit
    const hardwareCost = totalHardwareKits * hardwareRate * 4; // 4 leveling feet per rack
    items.push({
      itemType: 'HARDWARE',
      description: 'Heavy-Duty Leveling Studs, Base Plugs & High-Tensile Hardware Kit',
      quantity: totalHardwareKits * 4,
      unit: 'PIECE',
      unitRate: hardwareRate,
      totalAmount: hardwareCost,
    });

    // 5. Powder Coating
    const powderCoatCost = Math.round(totalPowderCoatSqM * powderCoatRate);
    items.push({
      itemType: 'FINISH',
      description: '7-Tank Pre-treatment & Pure Epoxy Polyester Powder Coating (60-80 Microns)',
      quantity: totalPowderCoatSqM,
      unit: 'SQ_M',
      unitRate: powderCoatRate,
      totalAmount: powderCoatCost,
    });

    // 6. Fabrication Labor
    const fabricationCost = totalFabricationJobs * fabricationRate;
    items.push({
      itemType: 'FABRICATION',
      description: 'Precision CNC Punching, Press-Brake Notching & Factory Assembly Labor',
      quantity: totalFabricationJobs,
      unit: 'JOB',
      unitRate: fabricationRate,
      totalAmount: fabricationCost,
    });

    // 7. On-site Installation
    const installationCost = totalInstallationJobs * installRate;
    if (includeInstallation && installationCost > 0) {
      items.push({
        itemType: 'INSTALLATION',
        description: 'On-Site Erection, Precise Leveling & Inter-locking Assembly by JK Technicians',
        quantity: totalInstallationJobs,
        unit: 'JOB',
        unitRate: installRate,
        totalAmount: installationCost,
      });
    }

    // 8. Logistics
    const transportationCost = racks.length > 0 ? transportRate : 0;
    if (transportationCost > 0) {
      items.push({
        itemType: 'LOGISTICS',
        description: 'Protective Corrugated Wrapping & Transit Delivery (Mumbai Metropolitan Region)',
        quantity: 1,
        unit: 'JOB',
        unitRate: transportationCost,
        totalAmount: transportationCost,
      });
    }

    // Subtotal
    const totalMaterialCost = sheetCost + structuralCost + bracketCost + hardwareCost;
    const subTotal =
      totalMaterialCost +
      powderCoatCost +
      fabricationCost +
      installationCost +
      transportationCost;

    // GST @ 18%
    const totalGstCost = Math.round(subTotal * this.GST_RATE);
    const grandTotal = subTotal + totalGstCost;

    // Indicative confidence range (-4% to +5%)
    const minRange = Math.round((grandTotal * 0.96) / 500) * 500;
    const maxRange = Math.round((grandTotal * 1.05) / 500) * 500;

    return {
      totalMaterialCost,
      totalFabricationCost: fabricationCost,
      totalPowderCoatingCost: powderCoatCost,
      totalLaborCost: fabricationCost,
      totalInstallationCost: installationCost,
      totalTransportationCost: transportationCost,
      subTotal,
      totalGstCost,
      grandTotal,
      minRange,
      maxRange,
      isIndicative: true,
      disclaimer:
        'Indicative Online Estimate — Final quotation is subject to physical site measurement, structural verification, and technical sign-off by JK Engineers Works Mumbai.',
      items,
      createdAt: new Date(),
    };
  }
}
