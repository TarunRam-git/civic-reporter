import clientPromise from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { CreateIssueRequest, CreateIssueResponse, IssueDocument } from '@/types';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest): Promise<NextResponse<CreateIssueResponse | { error: string }>> {
  try {
    const body: CreateIssueRequest = await request.json();
    const { title, description, imageUrl, imageData, qrCodeId, objectLocation, objectType, aadharNumber } = body;

    console.log('Creating issue with:', { qrCodeId, objectLocation, objectType, title, aadharNumber });

    // Validate required fields
    if (!objectLocation) {
      console.error('Missing required field: objectLocation');
      return NextResponse.json(
        { error: 'Object location is required' },
        { status: 400 }
      );
    }

    if (!objectType) {
      console.error('Missing required field: objectType');
      return NextResponse.json(
        { error: 'Object type is required' },
        { status: 400 }
      );
    }

    let finalImageUrl = imageUrl || '';

    // If imageData (base64) is provided, upload it
    if (imageData && !imageUrl) {
      try {
        // Remove the data:image/jpeg;base64, prefix if present
        let base64String = imageData;
        if (imageData.includes(',')) {
          base64String = imageData.split(',')[1];
        }

        // Validate base64 string
        if (!base64String || base64String.length === 0) {
          throw new Error('Invalid base64 image data');
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(base64String, 'base64');

        // Validate buffer size (should be at least a few KB for a real image)
        if (buffer.length < 1000) {
          throw new Error('Image data too small, possibly corrupted');
        }

        // Generate filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        const filename = `issue-${timestamp}-${random}.jpg`;

        // Create uploads/images directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'images');

        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }

        const filepath = join(uploadsDir, filename);

        // Write file to disk
        await writeFile(filepath, buffer);

        // Verify file was written
        if (existsSync(filepath)) {
          const stats = await import('fs/promises').then(m => m.stat(filepath));
          console.log(`Image saved: ${filename}, size: ${stats.size} bytes`);
        }

        finalImageUrl = `/uploads/images/${filename}`;
      } catch (uploadError) {
        console.error('Error processing image:', uploadError);
        // Continue without image if upload fails - don't block the issue creation
      }
    }

    const client = await clientPromise;
    const db = client.db('civic-reporter');

    const trackingId = `ISSUE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Cast objectType to proper type
    const validObjectTypes = ['streetlight', 'garbage_can', 'road', 'sidewalk', 'park', 'other'];
    const finalObjectType = validObjectTypes.includes(objectType) ? objectType : 'other';

    const newIssue: IssueDocument = {
      trackingId,
      userId: aadharNumber,
      aadharNumber,
      title,
      description,
      imageUrl: finalImageUrl,
      objectLocation,
      objectType: finalObjectType as any,
      status: 'open',
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Only add qrCodeId if it was provided
    if (qrCodeId) {
      (newIssue as any).qrCodeId = qrCodeId;
    }

    console.log('Issue object before insert:', newIssue);

    const result = await db.collection<IssueDocument>('issues').insertOne(newIssue);

    console.log('Issue inserted with ID:', result.insertedId, 'qrCodeId:', qrCodeId, 'objectType:', finalObjectType, 'objectLocation:', objectLocation);

    return NextResponse.json({
      success: true,
      trackingId,
      issueId: result.insertedId.toString()
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
