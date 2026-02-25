// Authentication Login Route - MVP Implementation
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // MVP: Create a simple user session
    const user = {
      id: `user_${Date.now()}`,
      email,
      name: name || email.split('@')[0],
      profileComplete: false,
    };

    // In production, this would create a session in the database
    // For MVP, we'll return the user object to be stored in localStorage
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
