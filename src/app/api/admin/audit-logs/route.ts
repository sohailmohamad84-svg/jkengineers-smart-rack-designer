import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { container } from '@/infrastructure/di/container';

export async function GET(req: NextRequest) {
  const { errorResponse } = requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const logs = await container.auditService.getLogs(100);
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('[API audit-logs GET] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to retrieve audit logs' }, { status: 500 });
  }
}
