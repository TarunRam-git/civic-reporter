import clientPromise from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { CivicObject } from '@/types';

interface CreateObjectRequest {
  objectType: string;
  address: string;
  latitude: number;
  longitude: number;
  createdBy: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<{ objectId: string } | { error: string }>> {
  try {
    const body: CreateObjectRequest = await request.json();
    const { objectType, address, latitude, longitude, createdBy } = body;

    // Validate address field - REQUIRED
    if (!address || address.trim().length === 0) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    if (address.trim().length < 5) {
      return NextResponse.json(
        { error: 'Address must be at least 5 characters long' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (latitude == null || longitude == null) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('civic-reporter');

    const objectId = `OBJ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const newObject: CivicObject = {
      id: objectId,
      objectType: objectType as 'streetlight' | 'garbage_can' | 'road' | 'sidewalk' | 'park' | 'other',
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      address: address.trim(), // Store trimmed address
      createdBy,
      createdAt: new Date()
    };

    console.log('➕ Creating new civic object:', newObject);

    await db.collection<CivicObject>('civicObjects').insertOne(newObject);

    console.log('✓ Civic object created successfully with ID:', objectId);
    return NextResponse.json({ objectId }, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating object:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
