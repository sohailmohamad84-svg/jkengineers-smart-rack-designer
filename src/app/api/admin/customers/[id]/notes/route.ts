import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/infrastructure/db/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, errorResponse } = requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { noteText } = body;

    if (!noteText || !noteText.trim()) {
      return NextResponse.json({ success: false, message: 'Note text cannot be empty' }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({
      where: { userId: session!.userId },
    });

    if (!admin) {
      return NextResponse.json({ success: false, message: 'Admin profile required.' }, { status: 403 });
    }

    const note = await prisma.customerNote.create({
      data: {
        customerId: params.id,
        adminId: admin.id,
        noteText: noteText.trim(),
      },
      include: {
        admin: true,
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error('[API /api/admin/customers/:id/notes] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to add customer note' }, { status: 500 });
  }
}
