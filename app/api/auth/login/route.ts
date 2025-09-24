import { NextRequest, NextResponse } from 'next/server';
import { getUserByMemberIdOrEmail } from '@/lib/data';
import { generateToken, verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, password } = body;

    if (!memberId || !password) {
      return NextResponse.json(
        { success: false, message: 'Member ID and password are required' },
        { status: 400 }
      );
    }

    // Find user by member ID or email
    const user = await getUserByMemberIdOrEmail(memberId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      memberId: user.memberId,
      email: user.email,
      role: user.role,
    });

    // Return user data (excluding password hash)
    const { passwordHash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      token,
      user: userWithoutPassword,
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}