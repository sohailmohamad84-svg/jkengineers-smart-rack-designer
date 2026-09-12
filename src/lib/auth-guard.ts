import { NextRequest, NextResponse } from 'next/server';
import { TokenService, AuthSessionPayload } from '../infrastructure/auth/TokenService';

export function getSessionFromRequest(req: NextRequest): AuthSessionPayload | null {
  // Check cookie first
  const cookieToken = req.cookies.get('jk_session')?.value;
  if (cookieToken) {
    const payload = TokenService.verifyToken(cookieToken);
    if (payload) return payload;
  }

  // Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return TokenService.verifyToken(token);
  }

  return null;
}

export function requireCustomer(req: NextRequest): { session?: AuthSessionPayload; errorResponse?: NextResponse } {
  const session = getSessionFromRequest(req);
  if (!session || (session.role !== 'CUSTOMER' && session.role !== 'ADMIN')) {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: 'Unauthorized. Customer authentication required.' },
        { status: 401 }
      ),
    };
  }
  return { session };
}

export function requireAdmin(req: NextRequest): { session?: AuthSessionPayload; errorResponse?: NextResponse } {
  const session = getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: 'Forbidden. Administrator privileges required.' },
        { status: 403 }
      ),
    };
  }
  return { session };
}
