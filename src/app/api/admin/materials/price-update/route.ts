import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { UpdateMaterialPriceUseCase } from '@/application/pricing/UpdateMaterialPriceUseCase';
import { prisma } from '@/infrastructure/db/prisma';

export async function POST(req: NextRequest) {
  const { session, errorResponse } = requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { materialId, newRate, changeReason } = body;

    if (!materialId || typeof newRate !== 'number' || newRate <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid materialId and positive newRate are required.' },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { userId: session!.userId },
    });

    const result = await UpdateMaterialPriceUseCase.execute({
      materialId,
      adminId: admin?.id || session!.userId,
      newRate,
      changeReason: changeReason || 'Market rate update by administrator',
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[API /api/admin/materials/price-update] Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal error' }, { status: 500 });
  }
}
