import { NextRequest, NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/auth-guard';
import { prisma } from '@/infrastructure/db/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, errorResponse } = requireCustomer(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { versionId } = body;

    if (!versionId) {
      return NextResponse.json({ success: false, message: 'versionId is required' }, { status: 400 });
    }

    const design = await prisma.design.findFirst({
      where: { projectId: params.id },
    });

    if (!design) {
      return NextResponse.json({ success: false, message: 'Design not found' }, { status: 404 });
    }

    await prisma.design.update({
      where: { id: design.id },
      data: { activeVersionId: versionId },
    });

    return NextResponse.json({ success: true, message: 'Active version updated.' });
  } catch (error) {
    console.error('[API select-version] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update active version' }, { status: 500 });
  }
}
