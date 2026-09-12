import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/infrastructure/db/prisma';

export async function GET(req: NextRequest) {
  const { errorResponse } = requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q')?.toLowerCase() || '';

    const customers = await prisma.customer.findMany({
      where: query
        ? {
            OR: [
              { fullName: { contains: query } },
              { city: { contains: query } },
              { shopLocation: { contains: query } },
              { user: { mobile: { contains: query } } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { mobile: true, email: true, createdAt: true } },
        projects: {
          orderBy: { createdAt: 'desc' },
          include: {
            storeType: true,
            designs: {
              include: {
                versions: {
                  take: 1,
                  orderBy: { createdAt: 'desc' },
                  include: { estimate: true },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, customers });
  } catch (error) {
    console.error('[API /api/admin/customers] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to retrieve customers' }, { status: 500 });
  }
}
