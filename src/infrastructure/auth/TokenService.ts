import jwt from 'jsonwebtoken';

export interface AuthSessionPayload {
  userId: string;
  role: 'CUSTOMER' | 'ADMIN' | 'DESIGNER' | 'SALES';
  mobile?: string;
  email?: string;
  customerId?: string;
  adminId?: string;
  fullName?: string;
}

export class TokenService {
  private static getSecret(): string {
    return process.env.JWT_SECRET || 'jk-engineers-super-secure-jwt-secret-mumbai-2026-production';
  }

  public static signToken(payload: AuthSessionPayload): string {
    return jwt.sign(payload, this.getSecret(), {
      expiresIn: '7d',
    });
  }

  public static verifyToken(token: string): AuthSessionPayload | null {
    try {
      return jwt.verify(token, this.getSecret()) as AuthSessionPayload;
    } catch {
      return null;
    }
  }
}
