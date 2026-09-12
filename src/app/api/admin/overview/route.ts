import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/infrastructure/db/prisma';

export async function GET(req: NextRequest) {
  const { errorResponse } = requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const totalCustomers = await prisma.customer.count();
    const totalProjects = await prisma.project.count();
    const totalDesigns = await prisma.designVersion.count();

    // Calculate pipeline value from latest estimates
    const estimates = await prisma.estimate.findMany({
      select: { grandTotal: true },
    });
    const totalEstimatedValue = estimates.reduce((sum, e) => sum + e.grandTotal, 0);

    // Group leads by status
    const projects = await prisma.project.findMany({
      select: { leadStatus: true },
    });
    const leadsByStatus: Record<string, number> = {};
    for (const p of projects) {
      leadsByStatus[p.leadStatus] = (leadsByStatus[p.leadStatus] || 0) + 1;
    }

    // Recent activity (latest projects & audit logs)
    const recentProjects = await prisma.project.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        storeType: true,
      },
    });

    const recentAuditLogs = await prisma.auditLog.findMany({
      take: 8,
      orderBy: { timestamp: 'desc' },
      include: {
        actor: { select: { email: true, role: true } },
      },
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalCustomers,
        totalProjects,
        totalDesigns,
        totalEstimatedValue,
        leadsByStatus,
      },
      recentProjects,
      recentAuditLogs,
    });
  } catch (error) {
    console.error('[API /api/admin/overview] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to load admin overview' }, { status: 500 });
  }
}
