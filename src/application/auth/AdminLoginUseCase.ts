import { prisma } from '../../infrastructure/db/prisma';
import { PasswordService } from '../../infrastructure/auth/PasswordService';
import { TokenService } from '../../infrastructure/auth/TokenService';

export interface AdminLoginInput {
  usernameOrEmail: string;
  password: string;
}

export interface AdminLoginResult {
  success: boolean;
  message: string;
  token?: string;
  admin?: {
    id: string;
    username: string;
    email: string;
    department: string;
    role: string;
  };
}

export class AdminLoginUseCase {
  public static async execute(input: AdminLoginInput): Promise<AdminLoginResult> {
    const term = input.usernameOrEmail.trim().toLowerCase();

    // Find admin by username or email
    const user = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        OR: [
          { email: term },
          { admin: { username: term } },
        ],
      },
      include: { admin: true },
    });

    if (!user || !user.passwordHash || !user.admin) {
      return {
        success: false,
        message: 'Invalid administrator credentials.',
      };
    }

    const isMatch = await PasswordService.verifyPassword(input.password, user.passwordHash);
    if (!isMatch) {
      return {
        success: false,
        message: 'Invalid administrator credentials.',
      };
    }

    const token = TokenService.signToken({
      userId: user.id,
      role: 'ADMIN',
      email: user.email || undefined,
      adminId: user.admin.id,
      fullName: user.admin.username,
    });

    return {
      success: true,
      message: 'Admin authentication successful.',
      token,
      admin: {
        id: user.admin.id,
        username: user.admin.username,
        email: user.email || '',
        department: user.admin.department,
        role: user.role,
      },
    };
  }
}
