import { describe, it, expect } from 'vitest';
import { PlacementValidator } from '../../src/domain/services/PlacementValidator';
import { PlacedRack } from '../../src/domain/entities/Rack';
import { ShopSpecification } from '../../src/domain/entities/Shop';

describe('PlacementValidator', () => {
  const sampleShop: ShopSpecification = {
    id: 'SHOP_001',
    shape: 'RECTANGLE',
    dimensions: {
      lengthMm: 6000,
      breadthMm: 4500,
      heightMm: 3000,
      displayUnit: 'FEET',
    },
    openings: [
      {
        id: 'DOOR_1',
        type: 'DOOR_MAIN',
        wall: 'NORTH',
        distanceMm: 1200,
        widthMm: 1000,
        heightMm: 2100,
        swingDirection: 'INSIDE',
      },
      {
        id: 'WIN_1',
        type: 'WINDOW',
        wall: 'SOUTH',
        distanceMm: 2000,
        widthMm: 1500,
        heightMm: 1200,
        swingDirection: 'NONE',
      },
    ],
    obstacles: [
      {
        id: 'PILLAR_1',
        type: 'PILLAR',
        posX: 3000,
        posY: 2000,
        widthMm: 400,
        depthMm: 400,
        heightMm: 3000,
      },
    ],
  };

  const sampleRack: PlacedRack = {
    id: 'RACK_1',
    rackTypeCode: 'WALL_STD_900',
    rackTypeName: 'Wall Display Unit',
    category: 'WALL_RACK',
    label: 'Wall Unit 1',
    posX: 0,
    posY: 2000,
    rotation: 0,
    widthMm: 900,
    depthMm: 450,
    heightMm: 2100,
    shelvesCount: 5,
    loadCapacityKg: 100,
    isDoubleSided: false,
  };

  describe('snapToGrid', () => {
    it('accurately snaps coordinates to 100mm, 250mm, and 500mm increments', () => {
      expect(PlacementValidator.snapToGrid(140, 100)).toBe(100);
      expect(PlacementValidator.snapToGrid(160, 100)).toBe(200);

      expect(PlacementValidator.snapToGrid(260, 250)).toBe(250);
      expect(PlacementValidator.snapToGrid(380, 250)).toBe(500);

      expect(PlacementValidator.snapToGrid(680, 500)).toBe(500);
      expect(PlacementValidator.snapToGrid(760, 500)).toBe(1000);
    });

    it('returns raw rounded value when grid size is 0 or disabled', () => {
      expect(PlacementValidator.snapToGrid(123.4, 0)).toBe(123);
      expect(PlacementValidator.snapToGrid(456.7, -1)).toBe(457);
    });
  });

  describe('validateRackPlacement', () => {
    it('accepts valid fixture within shop boundaries and clear of obstacles', () => {
      const result = PlacementValidator.validateRackPlacement(
        sampleRack,
        [],
        sampleShop
      );
      expect(result.isValid).toBe(true);
    });

    it('rejects fixtures extending outside shop boundaries', () => {
      const outOfBoundsEast: PlacedRack = {
        ...sampleRack,
        posX: 5500, // 5500 + 900 = 6400 > 6000
        posY: 1000,
      };
      const resultEast = PlacementValidator.validateRackPlacement(outOfBoundsEast, [], sampleShop);
      expect(resultEast.isValid).toBe(false);
      expect(resultEast.reason).toBe('OUT_OF_BOUNDS');

      const outOfBoundsNegative: PlacedRack = {
        ...sampleRack,
        posX: -100,
        posY: 1000,
      };
      const resultNeg = PlacementValidator.validateRackPlacement(outOfBoundsNegative, [], sampleShop);
      expect(resultNeg.isValid).toBe(false);
      expect(resultNeg.reason).toBe('OUT_OF_BOUNDS');
    });

    it('rejects fixtures colliding with pillars or structural columns', () => {
      // Pillar is at X=3000, Y=2000, W=400, D=400. With 100mm buffer: X=[2900, 3500], Y=[1900, 2500]
      const collidingWithPillar: PlacedRack = {
        ...sampleRack,
        posX: 2950,
        posY: 1950,
      };
      const result = PlacementValidator.validateRackPlacement(collidingWithPillar, [], sampleShop);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('OBSTACLE_COLLISION');
    });

    it('rejects fixtures obstructing door entrance corridors', () => {
      // Main door is on North wall at distanceMm: 1200, width: 1000 (X: 1200 to 2200, Y: 0 to 1200)
      const blockingDoor: PlacedRack = {
        ...sampleRack,
        posX: 1300,
        posY: 200,
      };
      const result = PlacementValidator.validateRackPlacement(blockingDoor, [], sampleShop);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('DOOR_BUFFER_BLOCKED');
    });

    it('rejects fixtures overlapping existing racks with 20mm clearance buffer', () => {
      const existingRack: PlacedRack = {
        ...sampleRack,
        id: 'EXISTING_1',
        label: 'Existing Unit',
        posX: 1000,
        posY: 3000,
      };

      const overlappingRack: PlacedRack = {
        ...sampleRack,
        id: 'NEW_CANDIDATE',
        posX: 1400, // Overlaps [1000, 1900]
        posY: 3000,
      };

      const result = PlacementValidator.validateRackPlacement(
        overlappingRack,
        [existingRack],
        sampleShop
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('RACK_COLLISION');
      expect(result.collidingWith).toBe('EXISTING_1');
    });

    it('does not collide with itself when editing an existing rack', () => {
      const existingRack: PlacedRack = {
        ...sampleRack,
        id: 'EXISTING_1',
        posX: 1000,
        posY: 3000,
      };

      const movedSlightly: PlacedRack = {
        ...existingRack,
        posX: 1050,
      };

      const result = PlacementValidator.validateRackPlacement(
        movedSlightly,
        [existingRack],
        sampleShop,
        'EXISTING_1'
      );
      expect(result.isValid).toBe(true);
    });

    it('correctly validates rotated 90 degree fixtures with swapped width and depth', () => {
      // Rotated 90 deg: effective width is depthMm (450mm), effective depth is widthMm (900mm)
      const rotatedRack: PlacedRack = {
        ...sampleRack,
        posX: 5500, // 5500 + 450 = 5950 <= 6000 (Fits!)
        posY: 1000,
        rotation: 90,
      };
      const result = PlacementValidator.validateRackPlacement(rotatedRack, [], sampleShop);
      expect(result.isValid).toBe(true);
    });
  });
});
