import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/container';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeType = searchParams.get('storeType');

    const racks = storeType
      ? await container.rackRepository.getRacksForStoreType(storeType)
      : await container.rackRepository.getAllActiveRacks();

    return NextResponse.json({
      success: true,
      racks,
    });
  } catch (error: any) {
    console.error('[API /api/racks/catalogue] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch rack catalogue' },
      { status: 500 }
    );
  }
}
