import { container } from '../../infrastructure/di/container';
import { SendOtpResult } from '../../domain/ports/IOTPService';

export class SendCustomerOtpUseCase {
  public static async execute(mobile: string): Promise<SendOtpResult> {
    if (!mobile || !mobile.trim()) {
      return {
        success: false,
        message: 'Mobile number is required.',
        expiresInSeconds: 0,
      };
    }
    return container.otpService.sendOtp(mobile);
  }
}
