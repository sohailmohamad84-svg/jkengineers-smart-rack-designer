import { NextRequest, NextResponse } from 'next/server';
import { AdminLoginUseCase } from '@/application/auth/AdminLoginUseCase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { usernameOrEmail, password } = body;

    if (!usernameOrEmail || !password) {
      return NextResponse.json(
        { success: false, message: 'Username/email and password are required.' },
        { status: 400 }
      );
    }

    const result = await AdminLoginUseCase.execute({ usernameOrEmail, password });
    if (!result.success || !result.token) {
      return NextResponse.json({ success: false, message: result.message }, { status: 401 });
    }

    const response = NextResponse.json(result, { status: 200 });

    // Set secure admin session cookie
    response.cookies.set('jk_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('[API /api/admin/auth/login] Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
