import { NextRequest, NextResponse } from 'next/server';
import { SendCustomerOtpUseCase } from '@/application/auth/SendCustomerOtpUseCase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mobile } = body;

    if (!mobile) {
      return NextResponse.json({ success: false, message: 'Mobile number is required.' }, { status: 400 });
    }

    const result = await SendCustomerOtpUseCase.execute(mobile);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('[API /api/auth/otp/send] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error while sending OTP.' },
      { status: 500 }
    );
  }
}
