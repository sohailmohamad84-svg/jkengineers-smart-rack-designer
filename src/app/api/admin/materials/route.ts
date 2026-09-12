import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/infrastructure/db/prisma';

export async function GET(req: NextRequest) {
  const { errorResponse } = requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const materials = await prisma.material.findMany({
      orderBy: { category: 'asc' },
      include: {
        currentPrice: true,
        priceHistory: {
          orderBy: { effectiveDate: 'desc' },
          take: 5,
        },
      },
    });

    return NextResponse.json({ success: true, materials });
  } catch (error) {
    console.error('[API /api/admin/materials] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to load materials' }, { status: 500 });
  }
}
