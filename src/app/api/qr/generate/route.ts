import clientPromise from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { GenerateQRRequest, GenerateQRResponse, QRCodeDocument } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<GenerateQRResponse | { error: string }>> {
  try {
    const body: GenerateQRRequest = await request.json();
    const { objectLocation, objectType, createdBy } = body;

    const client = await clientPromise;
    const db = client.db('civic-reporter');

    const qrCodeId = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const newQRCode: QRCodeDocument = {
      qrCodeId,
      objectLocation,
      objectType,
      createdBy,
      createdAt: new Date()
    };

    await db.collection<QRCodeDocument>('qrCodes').insertOne(newQRCode);

    return NextResponse.json({
      success: true,
      qrCodeId
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
