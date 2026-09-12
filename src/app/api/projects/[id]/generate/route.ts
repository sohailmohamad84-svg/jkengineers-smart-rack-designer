import { NextRequest, NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/auth-guard';
import { GenerateShopDesignUseCase } from '@/application/designer/GenerateShopDesignUseCase';
import { prisma } from '@/infrastructure/db/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, errorResponse } = requireCustomer(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const customer = await prisma.customer.findUnique({
      where: { userId: session!.userId },
    });

    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer profile required.' }, { status: 403 });
    }

    const projectId = params.id === 'new' ? undefined : params.id;

    const result = await GenerateShopDesignUseCase.execute({
      projectId,
      customerId: customer.id,
      storeTypeCode: body.storeTypeCode,
      budget: Number(body.budget) || 200000,
      shape: body.shape || 'RECTANGLE',
      dimensions: body.dimensions,
      openings: body.openings || [],
      obstacles: body.obstacles || [],
      requirements: body.requirements || {},
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('[API /api/projects/:id/generate] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error while generating shop layout.' },
      { status: 500 }
    );
  }
}
