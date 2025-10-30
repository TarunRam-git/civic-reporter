import clientPromise from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { IssueDocument } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<{ issues: IssueDocument[] } | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const aadharNumber = searchParams.get('aadharNumber');

    if (!aadharNumber) {
      return NextResponse.json(
        { error: 'Aadhar number required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('civic-reporter');

    const issues = await db.collection<IssueDocument>('issues')
      .find({ aadharNumber })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ issues });
  } catch (error) {
    console.error('Error fetching user issues:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
