import { NextRequest, NextResponse } from 'next/server';
import { VerifyCustomerOtpUseCase } from '@/application/auth/VerifyCustomerOtpUseCase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mobile, otp, fullName, whatsappNumber, email, city, shopLocation, businessName } = body;

    if (!mobile || !otp) {
      return NextResponse.json(
        { success: false, message: 'Mobile number and OTP are required.' },
        { status: 400 }
      );
    }

    const result = await VerifyCustomerOtpUseCase.execute({
      mobile,
      otp,
      fullName: fullName || 'Customer',
      whatsappNumber,
      email,
      city: city || 'Mumbai',
      shopLocation: shopLocation || 'Mumbai',
      businessName,
    });

    if (!result.success || !result.token) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    const response = NextResponse.json(result, { status: 200 });

    // Set secure session cookie
    response.cookies.set('jk_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('[API /api/auth/otp/verify] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error while verifying OTP.' },
      { status: 500 }
    );
  }
}
