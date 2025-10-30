import clientPromise from '@/app/lib/mongodb';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { SignUpRequest, SignUpResponse, UserDocument } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<SignUpResponse>> {
  try {
    const body: SignUpRequest = await request.json();
    const { aadharNumber, password, role, staffId } = body;

    // Validate input
    if (!aadharNumber || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (role === 'staff' && !staffId) {
      return NextResponse.json(
        { error: 'Staff ID required for staff role' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('civic-reporter');

    // Check if user already exists
    const existingUser = await db.collection<UserDocument>('users').findOne({
      aadharNumber,
      role
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser: UserDocument = {
      aadharNumber,
      password: hashedPassword,
      role,
      ...(role === 'staff' && { staffId }),
      createdAt: new Date()
    };

    await db.collection<UserDocument>('users').insertOne(newUser);

    return NextResponse.json(
      { message: 'User created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
