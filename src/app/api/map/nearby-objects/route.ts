import clientPromise from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { CivicObject } from '@/types';

interface NearbyRequest {
  latitude: number;
  longitude: number;
  maxDistance: number;
}

// Haversine formula to calculate distance in meters between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(request: NextRequest): Promise<NextResponse<{ objects: CivicObject[] } | { error: string }>> {
  try {
    const body: NearbyRequest = await request.json();
    const { latitude, longitude, maxDistance } = body;

    console.log('🔍 Nearby objects query:', { latitude, longitude, maxDistance });

    const client = await clientPromise;
    const db = client.db('civic-reporter');

    // First, check if civicObjects collection exists and has documents
    const totalCount = await db.collection<CivicObject>('civicObjects').countDocuments();
    console.log(`📊 Total documents in civicObjects: ${totalCount}`);

    if (totalCount === 0) {
      console.log('⚠️ No civic objects found in database');
      return NextResponse.json({ objects: [] });
    }

    // Get ALL objects first, then filter by distance in application
    // This avoids geospatial index issues
    const allObjects = await db.collection<CivicObject>('civicObjects').find({}).toArray();
    console.log(`📍 Retrieved ${allObjects.length} total civic objects`);

    // Filter by distance using Haversine formula
    const nearbyObjects = allObjects.filter(obj => {
      if (!obj.location || !obj.location.coordinates || obj.location.coordinates.length < 2) {
        console.warn('❌ Invalid location data:', obj);
        return false;
      }
      const [objLng, objLat] = obj.location.coordinates;
      const distance = calculateDistance(latitude, longitude, objLat, objLng);
      console.log(`  Distance to ${obj.id}: ${distance.toFixed(2)}m`);
      return distance <= maxDistance;
    });

    console.log(`✓ Found ${nearbyObjects.length} nearby objects within ${maxDistance}m`);

    return NextResponse.json({ objects: nearbyObjects });
  } catch (error) {
    console.error('❌ Error fetching nearby objects:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown') },
      { status: 500 }
    );
  }
}
