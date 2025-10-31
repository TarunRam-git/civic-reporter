import clientPromise from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { MapObject } from '@/types';

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

    const client = await clientPromise;
    const db = client.db('civic-reporter');

    const objectId = `OBJ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const newObject: MapObject = {
      id: objectId,
      objectType: objectType as any,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      address,
      createdBy,
      createdAt: new Date()
    };

    await db.collection<MapObject>('mapObjects').insertOne(newObject);

    return NextResponse.json({ objectId }, { status: 201 });
  } catch (error) {
    console.error('Error creating object:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
