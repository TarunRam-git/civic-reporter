import clientPromise from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { GenerateQRRequest, GenerateQRResponse, CivicObject } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<GenerateQRResponse | { error: string }>> {
  try {
    const body = await request.json();
    const { objectLocation, objectType, createdBy, latitude, longitude } = body;

    // Validate required fields
    if (!objectLocation || objectLocation.trim().length === 0) {
      return NextResponse.json(
        { error: 'Object location (address) is required' },
        { status: 400 }
      );
    }

    if (objectLocation.trim().length < 5) {
      return NextResponse.json(
        { error: 'Object location must be at least 5 characters' },
        { status: 400 }
      );
    }

    if (latitude == null || longitude == null) {
      return NextResponse.json(
        { error: 'Missing latitude or longitude' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('civic-reporter');

    const qrCodeId = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Store QR as a CivicObject with qrCodeId field
    const newCivicObject: CivicObject = {
      id: qrCodeId,
      qrCodeId, // Mark this as a QR-generated object
      address: objectLocation.trim(), // Use objectLocation as address
      objectType,
      createdBy,
      createdAt: new Date(),
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      }
    };

    console.log('📱 Creating QR civic object:', newCivicObject);

    await db.collection<CivicObject>('civicObjects').insertOne(newCivicObject);

    console.log('✓ QR civic object created successfully with ID:', qrCodeId);

    return NextResponse.json({
      success: true,
      qrCodeId
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
