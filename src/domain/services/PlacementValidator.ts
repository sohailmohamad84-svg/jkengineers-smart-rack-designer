import { PlacedRack, BoundingBox2D, getRackBoundingBox, doBoundingBoxesOverlap } from '../entities/Rack';
import { ShopSpecification, ShopObstacle, ShopOpening } from '../entities/Shop';

export interface ValidationResult {
  isValid: boolean;
  reason?: 'OUT_OF_BOUNDS' | 'RACK_COLLISION' | 'OBSTACLE_COLLISION' | 'DOOR_BUFFER_BLOCKED' | 'WINDOW_BLOCKED';
  message?: string;
  collidingWith?: string;
}

export class PlacementValidator {
  public static readonly DEFAULT_OBSTACLE_BUFFER_MM = 100;
  public static readonly DEFAULT_DOOR_BUFFER_MM = 300;
  public static readonly DEFAULT_WINDOW_BUFFER_MM = 500;
  public static readonly RACK_SPACING_TOLERANCE_MM = 20;

  /**
   * Snaps a coordinate to the nearest grid increment in millimeters.
   * If grid is 0 or disabled, returns the original coordinate.
   */
  public static snapToGrid(value: number, gridSizeMm: number): number {
    if (!gridSizeMm || gridSizeMm <= 0) return Math.round(value);
    return Math.round(value / gridSizeMm) * gridSizeMm;
  }

  /**
   * Builds an obstacle's 2D bounding box including clearance buffer.
   */
  public static getObstacleBoundingBox(
    obstacle: ShopObstacle,
    bufferMm: number = PlacementValidator.DEFAULT_OBSTACLE_BUFFER_MM
  ): BoundingBox2D {
    return {
      minX: obstacle.posX - bufferMm,
      minY: obstacle.posY - bufferMm,
      maxX: obstacle.posX + obstacle.widthMm + bufferMm,
      maxY: obstacle.posY + obstacle.depthMm + bufferMm,
    };
  }

  /**
   * Builds an opening's buffer zone (door swing / entrance corridor or window buffer).
   */
  public static getOpeningBoundingBox(
    opening: ShopOpening,
    shopLengthMm: number,
    shopBreadthMm: number,
    doorBufferMm: number = PlacementValidator.DEFAULT_DOOR_BUFFER_MM,
    windowBufferMm: number = PlacementValidator.DEFAULT_WINDOW_BUFFER_MM
  ): BoundingBox2D {
    const isWindow = opening.type === 'WINDOW';
    const depthClearance = isWindow ? windowBufferMm : 1200; // 1.2m clear walking corridor for doors
    const lateralBuffer = isWindow ? 100 : doorBufferMm;

    let minX = 0, minY = 0, maxX = 0, maxY = 0;

    switch (opening.wall) {
      case 'NORTH':
        minX = opening.distanceMm - lateralBuffer;
        maxX = opening.distanceMm + opening.widthMm + lateralBuffer;
        minY = 0;
        maxY = depthClearance;
        break;
      case 'SOUTH':
        minX = opening.distanceMm - lateralBuffer;
        maxX = opening.distanceMm + opening.widthMm + lateralBuffer;
        minY = shopBreadthMm - depthClearance;
        maxY = shopBreadthMm;
        break;
      case 'WEST':
        minX = 0;
        maxX = depthClearance;
        minY = opening.distanceMm - lateralBuffer;
        maxY = opening.distanceMm + opening.widthMm + lateralBuffer;
        break;
      case 'EAST':
        minX = shopLengthMm - depthClearance;
        maxX = shopLengthMm;
        minY = opening.distanceMm - lateralBuffer;
        maxY = opening.distanceMm + opening.widthMm + lateralBuffer;
        break;
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Validates placement of a rack candidate against:
   * 1. Shop boundary containment
   * 2. Obstacles (pillars, electrical panels)
   * 3. Openings (door entrance corridors and window zones)
   * 4. Collisions with other placed racks
   */
  public static validateRackPlacement(
    candidate: PlacedRack,
    allRacks: PlacedRack[],
    shop: ShopSpecification,
    excludedRackIndexOrId?: number | string
  ): ValidationResult {
    const lengthMm = shop.dimensions.lengthMm;
    const breadthMm = shop.dimensions.breadthMm;
    const rackBox = getRackBoundingBox(candidate);

    // 1. Boundary check: must stay completely within shop interior
    if (rackBox.minX < 0 || rackBox.minY < 0 || rackBox.maxX > lengthMm || rackBox.maxY > breadthMm) {
      return {
        isValid: false,
        reason: 'OUT_OF_BOUNDS',
        message: 'Fixture extends beyond shop boundary walls',
      };
    }

    // 2. Obstacle collision check
    for (const obs of shop.obstacles || []) {
      const obsBox = this.getObstacleBoundingBox(obs);
      if (doBoundingBoxesOverlap(rackBox, obsBox)) {
        return {
          isValid: false,
          reason: 'OBSTACLE_COLLISION',
          message: `Collides with ${obs.type.toLowerCase()} clearance zone`,
          collidingWith: obs.id || obs.type,
        };
      }
    }

    // 3. Opening buffer check (doors & windows)
    for (const op of shop.openings || []) {
      const opBox = this.getOpeningBoundingBox(op, lengthMm, breadthMm);
      if (doBoundingBoxesOverlap(rackBox, opBox)) {
        const isDoor = op.type.startsWith('DOOR');
        return {
          isValid: false,
          reason: isDoor ? 'DOOR_BUFFER_BLOCKED' : 'WINDOW_BLOCKED',
          message: isDoor ? 'Obstructs door clearance corridor' : 'Obstructs window access zone',
          collidingWith: op.id || op.type,
        };
      }
    }

    // 4. Rack-to-Rack collision check (excluding itself)
    for (let i = 0; i < (allRacks || []).length; i++) {
      const existing = allRacks[i];
      if (excludedRackIndexOrId !== undefined) {
        if (typeof excludedRackIndexOrId === 'number' && i === excludedRackIndexOrId) continue;
        if (typeof excludedRackIndexOrId === 'string' && (existing.id === excludedRackIndexOrId || existing.label === excludedRackIndexOrId)) continue;
      }

      // Check collision with 20mm tolerance buffer
      const existingBox = getRackBoundingBox(existing, this.RACK_SPACING_TOLERANCE_MM);
      if (doBoundingBoxesOverlap(rackBox, existingBox)) {
        return {
          isValid: false,
          reason: 'RACK_COLLISION',
          message: `Overlaps with ${existing.label || existing.rackTypeName}`,
          collidingWith: existing.id || existing.label,
        };
      }
    }

    return { isValid: true };
  }
}
