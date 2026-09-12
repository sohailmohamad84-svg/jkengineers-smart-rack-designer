import { IOTPService } from '../../domain/ports/IOTPService';
import { MockOTPService } from './MockOTPService';

export class OTPServiceFactory {
  private static instance: IOTPService;

  public static getService(): IOTPService {
    if (!this.instance) {
      const provider = process.env.OTP_PROVIDER || 'mock';
      if (provider === 'mock') {
        this.instance = new MockOTPService();
      } else {
        // Extensible fallback: can wire Twilio/MSG91 adapters here
        this.instance = new MockOTPService();
      }
    }
    return this.instance;
  }
}
