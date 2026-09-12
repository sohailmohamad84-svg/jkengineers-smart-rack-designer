import { describe, it, expect } from 'vitest';
import { MeasurementService } from '../../src/domain/services/MeasurementService';
import { PricingEngine } from '../../src/domain/services/PricingEngine';
import { RackDesignEngine } from '../../src/domain/services/RackDesignEngine';
import { BudgetOptimizationService } from '../../src/domain/services/BudgetOptimizationService';
import { ShopSpecification } from '../../src/domain/entities/Shop';
import { RackSpecification, PlacedRack } from '../../src/domain/entities/Rack';
import { MaterialRate } from '../../src/domain/entities/Material';

describe('Domain Services Verification', () => {
  describe('MeasurementService', () => {
    it('accurately converts feet, inches, meters to canonical millimeters', () => {
      // 10 feet = 3048 mm
      expect(MeasurementService.toMillimeters(10, 'FEET')).toBe(3048);
      // 10 ft 6 in = 3048 + 152.4 = 3200 mm
      expect(MeasurementService.toMillimeters(10, 'FEET', 6)).toBe(3200);
      // 5 meters = 5000 mm
      expect(MeasurementService.toMillimeters(5, 'METERS')).toBe(5000);
      // 48 inches = 1219 mm
      expect(MeasurementService.toMillimeters(48, 'INCHES')).toBe(1219);
    });

    it('parses human compound dimension strings correctly', () => {
      expect(MeasurementService.parseDimensionString('12 ft 6 in')).toBe(3810);
      expect(MeasurementService.parseDimensionString('4.5m')).toBe(4500);
      expect(MeasurementService.parseDimensionString('3000mm')).toBe(3000);
    });

    it('validates shop geometry boundaries and rejects out-of-bounds doors', () => {
      const validShop = MeasurementService.validateShopGeometry(
        { lengthMm: 6000, breadthMm: 4500, heightMm: 3000, displayUnit: 'FEET' },
        [{ wall: 'NORTH', distanceMm: 1200, widthMm: 1000, heightMm: 2100, type: 'DOOR_MAIN' }],
        []
      );
      expect(validShop.isValid).toBe(true);

      const invalidDoor = MeasurementService.validateShopGeometry(
        { lengthMm: 6000, breadthMm: 4500, heightMm: 3000, displayUnit: 'FEET' },
        [{ wall: 'NORTH', distanceMm: 5500, widthMm: 1000, heightMm: 2100, type: 'DOOR_MAIN' }], // 5500 + 1000 > 6000
        []
      );
      expect(invalidDoor.isValid).toBe(false);
      expect(invalidDoor.errors.length).toBeGreaterThan(0);
    });
  });

  describe('PricingEngine', () => {
    const sampleMaterials: MaterialRate[] = [
      { id: '1', code: 'MS_SHEET_CRCA', name: 'CRCA Sheet', category: 'STEEL', unit: 'KG', currentRate: 85, effectiveDate: new Date() },
      { id: '2', code: 'MS_SLOTTED_ANGLE', name: 'MS Angle', category: 'STEEL', unit: 'KG', currentRate: 92, effectiveDate: new Date() },
      { id: '3', code: 'MS_ERW_PIPE', name: 'MS Pipe', category: 'STEEL', unit: 'KG', currentRate: 96, effectiveDate: new Date() },
      { id: '4', code: 'POWDER_COATING', name: 'Powder Coating', category: 'FINISH', unit: 'SQ_M', currentRate: 45, effectiveDate: new Date() },
      { id: '5', code: 'BRACKET_HEAVY', name: 'Bracket', category: 'HARDWARE', unit: 'PIECE', currentRate: 85, effectiveDate: new Date() },
      { id: '6', code: 'FASTENERS_HARDWARE', name: 'Fasteners', category: 'HARDWARE', unit: 'PIECE', currentRate: 18, effectiveDate: new Date() },
      { id: '7', code: 'FABRICATION_LABOR', name: 'Fabrication', category: 'LABOUR', unit: 'JOB', currentRate: 650, effectiveDate: new Date() },
      { id: '8', code: 'INSTALLATION_LABOR', name: 'Installation', category: 'LABOUR', unit: 'JOB', currentRate: 450, effectiveDate: new Date() },
      { id: '9', code: 'LOCAL_TRANSPORTATION', name: 'Transport', category: 'LOGISTICS', unit: 'JOB', currentRate: 3500, effectiveDate: new Date() },
    ];

    const sampleRacks: PlacedRack[] = [
      {
        rackTypeCode: 'WALL_RACK_900',
        rackTypeName: 'Wall Rack 900',
        category: 'WALL_RACK',
        label: 'Wall Rack',
        posX: 1000,
        posY: 0,
        rotation: 0,
        widthMm: 900,
        depthMm: 450,
        heightMm: 2100,
        shelvesCount: 5,
        loadCapacityKg: 70,
        isDoubleSided: false,
      },
    ];

    it('calculates transparent BOM, subtotal, 18% GST, and confidence ranges', () => {
      const estimate = PricingEngine.calculateEstimate(sampleRacks, sampleMaterials);

      expect(estimate.items.length).toBeGreaterThan(5);
      expect(estimate.totalMaterialCost).toBeGreaterThan(0);
      expect(estimate.totalFabricationCost).toBe(650);
      expect(estimate.totalInstallationCost).toBe(450);
      expect(estimate.totalGstCost).toBe(Math.round(estimate.subTotal * 0.18));
      expect(estimate.grandTotal).toBe(estimate.subTotal + estimate.totalGstCost);
      expect(estimate.minRange).toBeLessThan(estimate.grandTotal);
      expect(estimate.maxRange).toBeGreaterThan(estimate.grandTotal);
      expect(estimate.isIndicative).toBe(true);
    });
  });

  describe('RackDesignEngine & BudgetOptimizationService', () => {
    const sampleShop: ShopSpecification = {
      id: 'TEST_SHOP',
      shape: 'RECTANGLE',
      dimensions: { lengthMm: 7000, breadthMm: 5000, heightMm: 3000, displayUnit: 'FEET' },
      openings: [
        { type: 'DOOR_MAIN', wall: 'NORTH', distanceMm: 1500, widthMm: 1200, heightMm: 2100, swingDirection: 'INSIDE' },
      ],
      obstacles: [
        { type: 'PILLAR', posX: 3500, posY: 2500, widthMm: 400, depthMm: 400, heightMm: 3000 },
      ],
    };

    const sampleCatalog: RackSpecification[] = [
      {
        id: '1',
        code: 'WALL_RACK_900',
        name: 'Wall Rack 900',
        category: 'WALL_RACK',
        defaultWidthMm: 900,
        defaultHeightMm: 2100,
        defaultDepthMm: 450,
        defaultShelves: 5,
        finish: 'POWDER_COATED',
        loadCapacityKg: 70,
        isDoubleSided: false,
        baseShelfDepthMm: 450,
        baseCost: 5200,
        active: true,
        compatibleStoreTypes: ['ALL'],
      },
      {
        id: '2',
        code: 'WALL_RACK_1200',
        name: 'Wall Rack 1200',
        category: 'WALL_RACK',
        defaultWidthMm: 1200,
        defaultHeightMm: 2100,
        defaultDepthMm: 450,
        defaultShelves: 5,
        finish: 'POWDER_COATED',
        loadCapacityKg: 80,
        isDoubleSided: false,
        baseShelfDepthMm: 450,
        baseCost: 6400,
        active: true,
        compatibleStoreTypes: ['ALL'],
      },
      {
        id: '3',
        code: 'GONDOLA_RACK_900',
        name: 'Gondola Rack 900',
        category: 'GONDOLA_RACK',
        defaultWidthMm: 900,
        defaultHeightMm: 1500,
        defaultDepthMm: 900,
        defaultShelves: 10,
        finish: 'POWDER_COATED',
        loadCapacityKg: 70,
        isDoubleSided: true,
        baseShelfDepthMm: 450,
        baseCost: 8900,
        active: true,
        compatibleStoreTypes: ['ALL'],
      },
      {
        id: '4',
        code: 'CHECKOUT_COUNTER_STD',
        name: 'Checkout Counter',
        category: 'CHECKOUT_COUNTER',
        defaultWidthMm: 1500,
        defaultHeightMm: 900,
        defaultDepthMm: 750,
        defaultShelves: 2,
        finish: 'POWDER_COATED',
        loadCapacityKg: 150,
        isDoubleSided: false,
        baseShelfDepthMm: 750,
        baseCost: 14500,
        active: true,
        compatibleStoreTypes: ['ALL'],
      },
    ];

    const sampleMaterials: MaterialRate[] = [
      { id: '1', code: 'MS_SHEET_CRCA', name: 'CRCA Sheet', category: 'STEEL', unit: 'KG', currentRate: 85, effectiveDate: new Date() },
      { id: '2', code: 'MS_SLOTTED_ANGLE', name: 'MS Angle', category: 'STEEL', unit: 'KG', currentRate: 92, effectiveDate: new Date() },
      { id: '3', code: 'MS_ERW_PIPE', name: 'MS Pipe', category: 'STEEL', unit: 'KG', currentRate: 96, effectiveDate: new Date() },
      { id: '4', code: 'POWDER_COATING', name: 'Powder Coating', category: 'FINISH', unit: 'SQ_M', currentRate: 45, effectiveDate: new Date() },
      { id: '5', code: 'BRACKET_HEAVY', name: 'Bracket', category: 'HARDWARE', unit: 'PIECE', currentRate: 85, effectiveDate: new Date() },
      { id: '6', code: 'FASTENERS_HARDWARE', name: 'Fasteners', category: 'HARDWARE', unit: 'PIECE', currentRate: 18, effectiveDate: new Date() },
      { id: '7', code: 'FABRICATION_LABOR', name: 'Fabrication', category: 'LABOUR', unit: 'JOB', currentRate: 650, effectiveDate: new Date() },
      { id: '8', code: 'INSTALLATION_LABOR', name: 'Installation', category: 'LABOUR', unit: 'JOB', currentRate: 450, effectiveDate: new Date() },
      { id: '9', code: 'LOCAL_TRANSPORTATION', name: 'Transport', category: 'LOGISTICS', unit: 'JOB', currentRate: 3500, effectiveDate: new Date() },
    ];

    it('generates 3 distinct layout options (Max Display, Balanced, Budget Optimized)', () => {
      const result = RackDesignEngine.generateLayoutOptions(
        sampleShop,
        'SUPERMARKET',
        250000,
        sampleCatalog,
        sampleMaterials,
        { REQ_GONDOLA_AISLES: true, REQ_CHECKOUT_COUNTER: true }
      );

      expect(result.options.length).toBe(3);
      const [optA, optB, optC] = result.options;

      expect(optA.optionType).toBe('OPTION_A_MAX_DISPLAY');
      expect(optB.optionType).toBe('OPTION_B_BALANCED');
      expect(optC.optionType).toBe('OPTION_C_BUDGET_OPTIMIZED');

      // Max display should have more racks than budget optimized
      expect(optA.totalRacks).toBeGreaterThanOrEqual(optC.totalRacks);

      // Verify no rack blocks the entrance door on North wall (distance: 1500 to 2700)
      for (const opt of result.options) {
        for (const rack of opt.racks) {
          if (rack.wallPlacement === 'NORTH') {
            const rackEnd = rack.posX + rack.widthMm;
            const doorBufferStart = 1500 - 300;
            const doorBufferEnd = 2700 + 300;
            const overlapsDoor = !(rackEnd <= doorBufferStart || rack.posX >= doorBufferEnd);
            expect(overlapsDoor).toBe(false);
          }
        }
      }
    });

    it('strictly preserves material quality under low budget (Rule 5)', () => {
      const optC = BudgetOptimizationService.optimizeForBudget(
        sampleShop,
        'SUPERMARKET',
        30000, // Strictly below minimum viable configuration cost
        sampleCatalog,
        sampleMaterials,
        { REQ_CHECKOUT_COUNTER: true }
      );

      // Verify explanation mentions non-degradation of steel quality
      expect(optC.explanation).toContain('NEVER downgrades');
      // All items in estimate must still use the standard material rate (₹85/kg, ₹92/kg, etc.)
      const sheetItem = optC.estimate.items.find((i) => i.description.includes('CRCA'));
      expect(sheetItem?.unitRate).toBe(85);
    });

    it('guarantees Cost(Option C) < Cost(Option B) <= Cost(Option A) across Medical Store and other store types', () => {
      // Test 20 x 15 ft Medical Store
      const medicalShop: ShopSpecification = {
        id: 'MED_SHOP',
        shape: 'RECTANGLE',
        dimensions: { lengthMm: 6096, breadthMm: 4572, heightMm: 3200, displayUnit: 'FEET' },
        openings: [
          { type: 'DOOR_MAIN', wall: 'NORTH', distanceMm: 2000, widthMm: 1200, heightMm: 2100, swingDirection: 'INSIDE' },
        ],
        obstacles: [],
      };

      const medicalCatalog: RackSpecification[] = [
        ...sampleCatalog,
        {
          id: '5',
          code: 'MEDICAL_RACK_900',
          name: 'Medical Rack 900',
          category: 'MEDICAL_RACK',
          defaultWidthMm: 900,
          defaultHeightMm: 2100,
          defaultDepthMm: 380,
          defaultShelves: 7,
          finish: 'POWDER_COATED',
          loadCapacityKg: 50,
          isDoubleSided: false,
          baseShelfDepthMm: 380,
          baseCost: 6900,
          active: true,
          compatibleStoreTypes: ['MEDICAL_STORE'],
        },
      ];

      const result = RackDesignEngine.generateLayoutOptions(
        medicalShop,
        'MEDICAL_STORE',
        200000,
        medicalCatalog,
        sampleMaterials,
        { REQ_CHECKOUT_COUNTER: true }
      );

      const [optA, optB, optC] = result.options;

      // Option C must be strictly cheaper than Option B and Option A
      expect(optC.estimate.grandTotal).toBeLessThan(optB.estimate.grandTotal);
      expect(optB.estimate.grandTotal).toBeLessThanOrEqual(optA.estimate.grandTotal);
      expect(optC.estimate.grandTotal).toBeLessThan(optA.estimate.grandTotal);

      // Option A must have highest or equal display area
      expect(optA.totalDisplayAreaSqM).toBeGreaterThanOrEqual(optB.totalDisplayAreaSqM);
      expect(optB.totalDisplayAreaSqM).toBeGreaterThanOrEqual(optC.totalDisplayAreaSqM);
    });
  });
});
