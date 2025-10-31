import clientPromise from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { MapObject } from '@/types';

interface NearbyRequest {
  latitude: number;
  longitude: number;
  maxDistance: number;
}

export async function POST(request: NextRequest): Promise<NextResponse<{ objects: MapObject[] } | { error: string }>> {
  try {
    const body: NearbyRequest = await request.json();
    const { latitude, longitude, maxDistance } = body;

    const client = await clientPromise;
    const db = client.db('civic-reporter');

    const objects = await db.collection<MapObject>('qrCodes')
      .find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: maxDistance
          }
        }
      })
      .toArray();

    return NextResponse.json({ objects });
  } catch (error) {
    console.error('Error fetching nearby objects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
