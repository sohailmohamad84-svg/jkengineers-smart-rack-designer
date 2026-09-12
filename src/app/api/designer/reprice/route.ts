import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/container';
import { PricingEngine } from '@/domain/services/PricingEngine';
import { PlacedRack } from '@/domain/entities/Rack';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const racks: PlacedRack[] = Array.isArray(body.racks) ? body.racks : [];
    const includeInstallation = body.includeInstallation !== false;

    // Fetch active materials deterministically from repository
    const activeMaterials = await container.materialRepository.getAllActiveMaterials();

    // Calculate BOM and costs deterministically
    const estimate = PricingEngine.calculateEstimate(racks, activeMaterials, includeInstallation);

    // Calculate display metrics
    let totalDisplayAreaSqM = 0;
    const racksByType: Record<string, number> = {};

    for (const r of racks) {
      const shelfArea = (r.widthMm / 1000) * (r.depthMm / 1000) * (r.shelvesCount || 5);
      totalDisplayAreaSqM += shelfArea;
      const typeKey = r.rackTypeName || r.label || 'Standard Unit';
      racksByType[typeKey] = (racksByType[typeKey] || 0) + 1;
    }

    totalDisplayAreaSqM = Math.round(totalDisplayAreaSqM * 10) / 10;

    return NextResponse.json({
      success: true,
      totalRacks: racks.length,
      totalDisplayAreaSqM,
      racksByType,
      estimate,
    });
  } catch (error: any) {
    console.error('[API /api/designer/reprice] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to calculate deterministic price' },
      { status: 500 }
    );
  }
}
