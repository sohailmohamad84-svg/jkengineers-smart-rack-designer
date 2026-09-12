import { NextRequest, NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/auth-guard';
import { GenerateShopDesignUseCase } from '@/application/designer/GenerateShopDesignUseCase';
import { prisma } from '@/infrastructure/db/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, errorResponse } = requireCustomer(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    let customer = await prisma.customer.findUnique({
      where: { userId: session!.userId },
    });

    // If an admin user is using the designer, auto-provision their customer profile
    if (!customer && session!.role === 'ADMIN') {
      customer = await prisma.customer.findFirst({
        where: { userId: session!.userId },
      });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            userId: session!.userId,
            fullName: session!.fullName || 'JK Administrator',
            businessName: 'JK Engineers Works Demo Store',
            city: 'Mumbai',
            shopLocation: 'Unit 12, Industrial Estate, Kanjurmarg West, Mumbai',
          },
        });
      }
    }

    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer profile required. Please complete verification step.' }, { status: 403 });
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
