import { CanonicalDimensions } from '../services/MeasurementService';

export type OpeningType = 'DOOR_MAIN' | 'DOOR_EXIT' | 'DOOR_ADDITIONAL' | 'WINDOW';
export type WallOrientation = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
export type SwingDirection = 'INSIDE' | 'OUTSIDE' | 'NONE';

export interface ShopOpening {
  id?: string;
  type: OpeningType;
  wall: WallOrientation;
  distanceMm: number; // Distance from wall start (North: left-to-right, South: left-to-right, East: top-to-bottom, West: top-to-bottom)
  widthMm: number;
  heightMm: number;
  swingDirection: SwingDirection;
}

export type ObstacleType =
  | 'PILLAR'
  | 'COLUMN'
  | 'ELECTRICAL_PANEL'
  | 'STAIRCASE'
  | 'COUNTER'
  | 'BEAM'
  | 'REFRIGERATOR'
  | 'OTHER';

export interface ShopObstacle {
  id?: string;
  type: ObstacleType;
  posX: number;     // mm from left (X=0)
  posY: number;     // mm from top (Y=0)
  widthMm: number;
  depthMm: number;
  heightMm: number;
  wall?: WallOrientation | null;
}

export interface ShopSpecification {
  id?: string;
  name?: string;
  shape: 'RECTANGLE' | 'SQUARE' | 'L_SHAPED' | 'CUSTOM';
  dimensions: CanonicalDimensions;
  openings: ShopOpening[];
  obstacles: ShopObstacle[];
}
