import clientPromise from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { UpdateStatusRequest } from '@/types';

export async function PUT(request: NextRequest): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const body: UpdateStatusRequest = await request.json();
    const { issueId, status } = body;

    const client = await clientPromise;
    const db = client.db('civic-reporter');

    await db.collection('issues').updateOne(
      { _id: new ObjectId(issueId) },
      {
        $set: {
          status,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
