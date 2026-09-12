export interface SendOtpResult {
  success: boolean;
  message: string;
  devOtp?: string; // Provided only in mock/development mode for testing convenience
  expiresInSeconds: number;
}

export interface VerifyOtpResult {
  isValid: boolean;
  message: string;
}

export interface IOTPService {
  sendOtp(mobile: string): Promise<SendOtpResult>;
  verifyOtp(mobile: string, enteredOtp: string): Promise<VerifyOtpResult>;
}
