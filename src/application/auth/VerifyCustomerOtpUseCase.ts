import { container } from '../../infrastructure/di/container';
import { prisma } from '../../infrastructure/db/prisma';
import { TokenService } from '../../infrastructure/auth/TokenService';

export interface CustomerRegistrationInput {
  mobile: string;
  otp: string;
  fullName: string;
  whatsappNumber?: string;
  email?: string;
  city: string;
  shopLocation: string;
  businessName?: string;
}

export interface CustomerAuthResult {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    mobile: string;
    fullName: string;
    city: string;
    role: string;
    customerId: string;
  };
}

export class VerifyCustomerOtpUseCase {
  public static async execute(input: CustomerRegistrationInput): Promise<CustomerAuthResult> {
    const cleanMobile = input.mobile.replace(/\D/g, '').slice(-10);

    // 1. Verify OTP
    const verifyResult = await container.otpService.verifyOtp(cleanMobile, input.otp);
    if (!verifyResult.isValid) {
      return {
        success: false,
        message: verifyResult.message,
      };
    }

    // 2. Find or create User with CUSTOMER role
    let user = await prisma.user.findFirst({
      where: { mobile: cleanMobile },
      include: { customer: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          mobile: cleanMobile,
          email: input.email ? input.email.trim().toLowerCase() : undefined,
          role: 'CUSTOMER',
          customer: {
            create: {
              fullName: input.fullName.trim(),
              whatsappNumber: input.whatsappNumber?.trim() || cleanMobile,
              city: input.city.trim(),
              shopLocation: input.shopLocation.trim(),
              businessName: input.businessName?.trim() || null,
            },
          },
        },
        include: { customer: true },
      });
    } else if (user.customer) {
      // Update existing customer info if provided
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: input.email ? input.email.trim().toLowerCase() : user.email,
          customer: {
            update: {
              fullName: input.fullName.trim() || user.customer.fullName,
              city: input.city.trim() || user.customer.city,
              shopLocation: input.shopLocation.trim() || user.customer.shopLocation,
              whatsappNumber: input.whatsappNumber?.trim() || user.customer.whatsappNumber,
              businessName: input.businessName?.trim() || user.customer.businessName,
            },
          },
        },
        include: { customer: true },
      });
    }

    if (!user.customer) {
      throw new Error('Failed to associate Customer profile with User');
    }

    // 3. Issue Session Token
    const token = TokenService.signToken({
      userId: user.id,
      role: 'CUSTOMER',
      mobile: cleanMobile,
      email: user.email || undefined,
      customerId: user.customer.id,
      fullName: user.customer.fullName,
    });

    return {
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        mobile: cleanMobile,
        fullName: user.customer.fullName,
        city: user.customer.city,
        role: user.role,
        customerId: user.customer.id,
      },
    };
  }
}
