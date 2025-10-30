import clientPromise from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { CreateIssueRequest, CreateIssueResponse, IssueDocument } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<CreateIssueResponse | { error: string }>> {
  try {
    const body: CreateIssueRequest = await request.json();
    const { title, description, imageUrl, qrCodeId, objectLocation, objectType, aadharNumber } = body;

    const client = await clientPromise;
    const db = client.db('civic-reporter');

    const trackingId = `ISSUE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const newIssue: IssueDocument = {
      trackingId,
      userId: aadharNumber,
      aadharNumber,
      title,
      description,
      imageUrl: imageUrl || '',
      qrCodeId,
      objectLocation,
      objectType,
      status: 'open',
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection<IssueDocument>('issues').insertOne(newIssue);

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
