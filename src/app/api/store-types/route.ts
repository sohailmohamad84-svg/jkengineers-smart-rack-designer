import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/db/prisma';

export async function GET() {
  try {
    const storeTypes = await prisma.storeType.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        storeRequirements: true,
      },
    });

    return NextResponse.json({ success: true, storeTypes });
  } catch (error) {
    console.error('[API /api/store-types] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch store types' }, { status: 500 });
  }
}
