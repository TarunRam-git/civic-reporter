import clientPromise from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...fields } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing object id' }, { status: 400 });
    }

    // Validate address field if being updated
    if ('address' in fields && (!fields.address || fields.address.trim().length < 5)) {
      return NextResponse.json({ error: 'Address must be at least 5 characters' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('civic-reporter');
    
    // Support both "id" (string) and "_id" (ObjectId)
    const filter = ObjectId.isValid(id) 
      ? { _id: new ObjectId(id) } 
      : { id: id };
    
    console.log('📝 Updating civic object:', { id, filter, fields });

    const result = await db.collection('civicObjects').updateOne(
      filter,
      { $set: fields }
    );

    if (result.matchedCount === 0) {
      console.warn('⚠️ Object not found:', id);
      return NextResponse.json({ error: 'Object not found' }, { status: 404 });
    }

    console.log('✓ Civic object updated successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating object:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
