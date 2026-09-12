import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { GenerateQuotationUseCase } from '@/application/quotation/GenerateQuotationUseCase';
import { container } from '@/infrastructure/di/container';

export async function POST(req: NextRequest) {
  const { session, errorResponse } = requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { estimateId, customTerms, validityDays } = body;

    if (!estimateId) {
      return NextResponse.json({ success: false, message: 'estimateId is required' }, { status: 400 });
    }

    const quotation = await GenerateQuotationUseCase.execute(
      estimateId,
      customTerms,
      validityDays || 15
    );

    await container.auditService.log({
      actorId: session!.userId,
      actorRole: 'ADMIN',
      action: 'QUOTATION_CREATED',
      entityType: 'Quotation',
      entityId: quotation.id,
      newValue: { quotationNumber: quotation.quotationNumber, amount: quotation.estimate.grandTotal },
    });

    return NextResponse.json({ success: true, quotation });
  } catch (error: any) {
    console.error('[API quotations/create] Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal error' }, { status: 500 });
  }
}
