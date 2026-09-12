import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/infrastructure/db/prisma';
import { container } from '@/infrastructure/di/container';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, errorResponse } = requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { leadStatus } = body;

    const validStatuses = [
      'NEW',
      'CONTACTED',
      'SITE_VISIT_REQUIRED',
      'DESIGN_PREPARED',
      'QUOTATION_SENT',
      'NEGOTIATION',
      'CONFIRMED',
      'PRODUCTION',
      'INSTALLATION',
      'COMPLETED',
      'LOST',
    ];

    if (!validStatuses.includes(leadStatus)) {
      return NextResponse.json(
        { success: false, message: `Invalid lead status: ${leadStatus}` },
        { status: 400 }
      );
    }

    const previousProject = await prisma.project.findUnique({
      where: { id: params.id },
      select: { leadStatus: true },
    });

    const updated = await prisma.project.update({
      where: { id: params.id },
      data: { leadStatus },
    });

    await container.auditService.log({
      actorId: session!.userId,
      actorRole: 'ADMIN',
      action: 'LEAD_STATUS_CHANGE',
      entityType: 'Project',
      entityId: params.id,
      previousValue: previousProject,
      newValue: { leadStatus },
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error('[API lead-status PATCH] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update lead status' }, { status: 500 });
  }
}
