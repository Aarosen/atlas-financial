import { NextRequest, NextResponse } from 'next/server';
import { FinancialProfileDb } from '@/lib/db/financialProfileDb';

const profileDb = new FinancialProfileDb();

// GET /api/profile - Get user's financial profile
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await profileDb.getProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/profile - Create or update financial profile
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const existingProfile = await profileDb.getProfile(userId);

    let profile;
    if (existingProfile) {
      profile = await profileDb.updateProfile(userId, data);
    } else {
      profile = await profileDb.createProfile(userId, data);
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error saving profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
