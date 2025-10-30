import clientPromise from '@/app/lib/mongodb';
import { NextResponse } from 'next/server';
import { IssueDocument } from '@/types';

export async function GET(): Promise<NextResponse<{ issues: IssueDocument[] } | { error: string }>> {
  try {
    const client = await clientPromise;
    const db = client.db('civic-reporter');

    const issues = await db.collection<IssueDocument>('issues')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ issues });
  } catch (error) {
    console.error('Error fetching all issues:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
