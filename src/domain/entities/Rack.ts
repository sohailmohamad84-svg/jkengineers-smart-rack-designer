export type RackCategory =
  | 'WALL_RACK'
  | 'GONDOLA_RACK'
  | 'END_RACK'
  | 'MEDICAL_RACK'
  | 'GARMENT_RACK'
  | 'CHECKOUT_COUNTER'
  | 'HEAVY_DUTY'
  | 'BIN_RACK';

export interface RackSpecification {
  id: string;
  code: string;
  name: string;
  category: RackCategory;
  defaultWidthMm: number;
  defaultHeightMm: number;
  defaultDepthMm: number;
  defaultShelves: number;
  finish: string;
  loadCapacityKg: number;
  isDoubleSided: boolean;
  baseShelfDepthMm: number;
  baseCost: number;
  active: boolean;
  imageMain?: string | null;
  compatibleStoreTypes: string[];
}

export interface PlacedRack {
  id?: string;
  rackTypeCode: string;
  rackTypeName: string;
  category: RackCategory;
  label: string;
  posX: number;       // In mm from top-left origin (0,0)
  posY: number;       // In mm from top-left origin (0,0)
  rotation: number;   // 0, 90, 180, 270 degrees
  widthMm: number;
  depthMm: number;
  heightMm: number;
  shelvesCount: number;
  wallPlacement?: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'ISLAND' | 'CASHIER';
  loadCapacityKg: number;
  isDoubleSided: boolean;
}

export interface BoundingBox2D {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function getRackBoundingBox(rack: PlacedRack, bufferMm: number = 0): BoundingBox2D {
  const isRotated = rack.rotation === 90 || rack.rotation === 270;
  const effectiveWidth = isRotated ? rack.depthMm : rack.widthMm;
  const effectiveDepth = isRotated ? rack.widthMm : rack.depthMm;

  return {
    minX: rack.posX - bufferMm,
    minY: rack.posY - bufferMm,
    maxX: rack.posX + effectiveWidth + bufferMm,
    maxY: rack.posY + effectiveDepth + bufferMm,
  };
}

export function doBoundingBoxesOverlap(a: BoundingBox2D, b: BoundingBox2D): boolean {
  return !(a.maxX <= b.minX || a.minX >= b.maxX || a.maxY <= b.minY || a.minY >= b.maxY);
}
