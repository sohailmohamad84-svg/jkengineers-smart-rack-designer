export type DisplayUnit = 'FEET' | 'INCHES' | 'METERS' | 'MM';

export interface ShopDimensionInput {
  length: number;
  breadth: number;
  height: number;
  unit: DisplayUnit;
  lengthInches?: number; // For compound feet + inches
  breadthInches?: number;
}

export interface CanonicalDimensions {
  lengthMm: number;
  breadthMm: number;
  heightMm: number;
  displayUnit: DisplayUnit;
}

export class MeasurementService {
  private static readonly MM_PER_INCH = 25.4;
  private static readonly MM_PER_FOOT = 304.8;
  private static readonly MM_PER_METER = 1000.0;

  /**
   * Convert any input dimension into canonical millimeters (mm)
   */
  public static toMillimeters(value: number, unit: DisplayUnit, inchesRemainder: number = 0): number {
    if (value < 0) {
      throw new Error('Dimension value cannot be negative');
    }

    switch (unit) {
      case 'FEET':
        return Math.round(value * this.MM_PER_FOOT + (inchesRemainder || 0) * this.MM_PER_INCH);
      case 'INCHES':
        return Math.round(value * this.MM_PER_INCH);
      case 'METERS':
        return Math.round(value * this.MM_PER_METER);
      case 'MM':
        return Math.round(value);
      default:
        throw new Error(`Unsupported measurement unit: ${unit}`);
    }
  }

  /**
   * Convert canonical millimeters into target display unit
   */
  public static fromMillimeters(mm: number, targetUnit: DisplayUnit): { primary: number; secondary?: number; formatted: string } {
    if (mm < 0) {
      throw new Error('Millimeters value cannot be negative');
    }

    switch (targetUnit) {
      case 'FEET': {
        const totalInches = mm / this.MM_PER_INCH;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        return {
          primary: feet,
          secondary: inches,
          formatted: `${feet} ft ${inches} in`,
        };
      }
      case 'INCHES': {
        const inches = +(mm / this.MM_PER_INCH).toFixed(1);
        return { primary: inches, formatted: `${inches} in` };
      }
      case 'METERS': {
        const meters = +(mm / this.MM_PER_METER).toFixed(2);
        return { primary: meters, formatted: `${meters} m` };
      }
      case 'MM':
        return { primary: Math.round(mm), formatted: `${Math.round(mm)} mm` };
      default:
        return { primary: Math.round(mm), formatted: `${Math.round(mm)} mm` };
    }
  }

  /**
   * Parse human text dimension string like "12 ft 6 in" or "15' 6\"" or "4.5m"
   */
  public static parseDimensionString(input: string): number {
    if (!input || !input.trim()) return 0;
    const clean = input.trim().toLowerCase();

    // Feet and inches pattern: 12ft 6in or 12' 6"
    const ftInRegex = /^(\d+(?:\.\d+)?)\s*(?:ft|'|feet)\s*(?:(\d+(?:\.\d+)?)\s*(?:in|"|inches)?)?$/;
    const ftInMatch = clean.match(ftInRegex);
    if (ftInMatch) {
      const feet = parseFloat(ftInMatch[1]);
      const inches = ftInMatch[2] ? parseFloat(ftInMatch[2]) : 0;
      return this.toMillimeters(feet, 'FEET', inches);
    }

    // Meters pattern: 4.5m or 4.5 meters
    const mRegex = /^(\d+(?:\.\d+)?)\s*(?:m|meters|meter)$/;
    const mMatch = clean.match(mRegex);
    if (mMatch) {
      return this.toMillimeters(parseFloat(mMatch[1]), 'METERS');
    }

    // MM pattern: 3000mm
    const mmRegex = /^(\d+(?:\.\d+)?)\s*(?:mm|millimeter|millimeters)$/;
    const mmMatch = clean.match(mmRegex);
    if (mmMatch) {
      return this.toMillimeters(parseFloat(mmMatch[1]), 'MM');
    }

    // Numeric only defaults to feet
    const num = parseFloat(clean);
    if (!isNaN(num)) {
      return this.toMillimeters(num, 'FEET');
    }

    throw new Error(`Unable to parse dimension string: "${input}"`);
  }

  /**
   * Validate entire shop geometry and openings constraints
   */
  public static validateShopGeometry(
    dimensions: CanonicalDimensions,
    openings: Array<{ wall: string; distanceMm: number; widthMm: number; heightMm: number; type: string }>,
    obstacles: Array<{ posX: number; posY: number; widthMm: number; depthMm: number; heightMm: number }>
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (dimensions.lengthMm <= 1000) {
      errors.push('Shop length must be at least 1000 mm (approx 3.3 ft).');
    }
    if (dimensions.breadthMm <= 1000) {
      errors.push('Shop breadth must be at least 1000 mm (approx 3.3 ft).');
    }
    if (dimensions.heightMm <= 1800) {
      errors.push('Shop height must be at least 1800 mm (approx 6 ft) to accommodate standard racks.');
    }

    for (const [index, op] of openings.entries()) {
      const wallLength = op.wall === 'NORTH' || op.wall === 'SOUTH' ? dimensions.lengthMm : dimensions.breadthMm;
      if (op.distanceMm + op.widthMm > wallLength) {
        errors.push(`Opening #${index + 1} (${op.type} on ${op.wall} wall) extends beyond the wall boundary.`);
      }
      if (op.heightMm > dimensions.heightMm) {
        errors.push(`Opening #${index + 1} height (${op.heightMm}mm) exceeds shop ceiling height (${dimensions.heightMm}mm).`);
      }
    }

    for (const [index, obs] of obstacles.entries()) {
      if (obs.posX + obs.widthMm > dimensions.lengthMm || obs.posY + obs.depthMm > dimensions.breadthMm) {
        errors.push(`Obstacle #${index + 1} is positioned outside the perimeter of the shop floor.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
