import crypto from 'crypto';
import { IOTPService, SendOtpResult, VerifyOtpResult } from '../../domain/ports/IOTPService';
import { prisma } from '../db/prisma';

export class MockOTPService implements IOTPService {
  private static readonly OTP_EXPIRY_MINUTES = 10;
  private static readonly MAX_ATTEMPTS = 5;

  public async sendOtp(mobile: string): Promise<SendOtpResult> {
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      return {
        success: false,
        message: 'Please provide a valid 10-digit mobile number.',
        expiresInSeconds: 0,
      };
    }

    // Generate 6-digit numeric OTP
    // In dev mode, generate a predictable code or random 6-digit
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(generatedOtp).digest('hex');
    const expiresAt = new Date(Date.now() + MockOTPService.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Expire any existing active OTP for this mobile
    await prisma.otpVerification.updateMany({
      where: { mobile: cleanMobile, verified: false },
      data: { verified: true },
    });

    // Save new OTP
    await prisma.otpVerification.create({
      data: {
        mobile: cleanMobile,
        otpHash,
        attempts: 0,
        expiresAt,
        verified: false,
      },
    });

    console.log(`[MockOTPService] Demo OTP for +91 ${cleanMobile}: ${generatedOtp}`);

    return {
      success: true,
      message: `OTP sent successfully to +91 ${cleanMobile}`,
      devOtp: generatedOtp, // Included in response for seamless local testing
      expiresInSeconds: MockOTPService.OTP_EXPIRY_MINUTES * 60,
    };
  }

  public async verifyOtp(mobile: string, enteredOtp: string): Promise<VerifyOtpResult> {
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const enteredHash = crypto.createHash('sha256').update(enteredOtp.trim()).digest('hex');

    const record = await prisma.otpVerification.findFirst({
      where: {
        mobile: cleanMobile,
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return {
        isValid: false,
        message: 'No active OTP found for this mobile number. Please request a new OTP.',
      };
    }

    if (new Date() > record.expiresAt) {
      return {
        isValid: false,
        message: 'OTP has expired. Please request a fresh OTP.',
      };
    }

    if (record.attempts >= MockOTPService.MAX_ATTEMPTS) {
      return {
        isValid: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.',
      };
    }

    // Increment attempt count
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    if (record.otpHash !== enteredHash) {
      const remainingAttempts = MockOTPService.MAX_ATTEMPTS - (record.attempts + 1);
      return {
        isValid: false,
        message: `Incorrect OTP. ${remainingAttempts} attempt(s) remaining.`,
      };
    }

    // Mark as verified
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { verified: true },
    });

    return {
      isValid: true,
      message: 'Mobile number successfully verified.',
    };
  }
}
