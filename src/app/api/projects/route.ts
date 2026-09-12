import { NextRequest, NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/auth-guard';
import { prisma } from '@/infrastructure/db/prisma';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = requireCustomer(req);
  if (errorResponse) return errorResponse;

  try {
    let customer = await prisma.customer.findUnique({
      where: { userId: session!.userId },
    });

    if (!customer && session!.role === 'ADMIN') {
      customer = await prisma.customer.findFirst({
        where: { userId: session!.userId },
      });
    }

    if (!customer && session!.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Customer profile not found.' }, { status: 404 });
    }

    const projects = await prisma.project.findMany({
      where: customer ? { customerId: customer.id } : {},
      orderBy: { updatedAt: 'desc' },
      include: {
        storeType: true,
        shop: {
          include: {
            dimensions: true,
          },
        },
        designs: {
          include: {
            versions: {
              include: {
                estimate: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error('[API /api/projects GET] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to retrieve projects' }, { status: 500 });
  }
}
