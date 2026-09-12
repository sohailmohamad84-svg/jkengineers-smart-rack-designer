import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/infrastructure/db/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { errorResponse } = requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        customerNotes: {
          orderBy: { createdAt: 'desc' },
          include: { admin: true },
        },
        projects: {
          orderBy: { createdAt: 'desc' },
          include: {
            storeType: true,
            shop: {
              include: {
                dimensions: true,
                openings: true,
                obstacles: true,
              },
            },
            designs: {
              include: {
                versions: {
                  include: {
                    estimate: { include: { items: true } },
                    racks: { include: { rackType: true } },
                  },
                },
              },
            },
            quotations: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('[API /api/admin/customers/:id] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to retrieve customer details' }, { status: 500 });
  }
}
