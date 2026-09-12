import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth-guard';
import { prisma } from '@/infrastructure/db/prisma';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        customer: true,
        admin: true,
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        role: user.role,
        mobile: user.mobile,
        email: user.email,
        customer: user.customer,
        admin: user.admin ? { username: user.admin.username, department: user.admin.department } : null,
      },
    });
  } catch (error) {
    console.error('[API /api/auth/me] Error:', error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
