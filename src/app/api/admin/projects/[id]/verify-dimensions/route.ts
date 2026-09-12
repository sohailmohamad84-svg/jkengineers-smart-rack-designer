import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { VerifySiteMeasurementUseCase } from '@/application/projects/VerifySiteMeasurementUseCase';
import { prisma } from '@/infrastructure/db/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, errorResponse } = requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { verifiedLengthMm, verifiedBreadthMm, verifiedHeightMm, adminNotes, regenerateDesign } = body;

    if (!verifiedLengthMm || !verifiedBreadthMm || !verifiedHeightMm) {
      return NextResponse.json(
        { success: false, message: 'Verified length, breadth, and height are required.' },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { userId: session!.userId },
    });

    const result = await VerifySiteMeasurementUseCase.execute({
      projectId: params.id,
      adminId: admin?.id || session!.userId,
      verifiedLengthMm: Number(verifiedLengthMm),
      verifiedBreadthMm: Number(verifiedBreadthMm),
      verifiedHeightMm: Number(verifiedHeightMm),
      adminNotes,
      regenerateDesign: regenerateDesign ?? true,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[API verify-dimensions] Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal error' }, { status: 500 });
  }
}
