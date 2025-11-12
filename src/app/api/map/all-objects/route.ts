import clientPromise from '@/app/lib/mongodb';
import { NextResponse } from 'next/server';
import { CivicObject } from '@/types';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('civic-reporter');
    
    console.log('📥 /api/map/all-objects called');
    
    const objects = await db.collection<CivicObject>('civicObjects').find({}).toArray();
    
    console.log(`✓ Retrieved ${objects.length} civic objects`);
    if (objects.length > 0) {
      console.log('Sample object:', JSON.stringify(objects[0], null, 2));
    }
    
    return NextResponse.json({ objects });
  } catch (error) {
    console.error('❌ Error in /api/map/all-objects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
