import clientPromise from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { AddCommentRequest, IssueDocument } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const body: AddCommentRequest = await request.json();
    const { issueId, comment } = body;

    const client = await clientPromise;
    const db = client.db('civic-reporter');

    await db.collection<IssueDocument>('issues').updateOne(
      { _id: new ObjectId(issueId) },
      {
        $push: { comments: comment },
        $set: { updatedAt: new Date() }
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
