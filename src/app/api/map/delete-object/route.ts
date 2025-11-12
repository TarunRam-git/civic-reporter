import clientPromise from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Missing object id' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db('civic-reporter');
    
    // Support both "id" (string) and "_id" (ObjectId)
    const objectId = ObjectId.isValid(id) ? new ObjectId(id) : id;
    
    console.log('🗑️ Deleting civic object:', id);

    const res = await db.collection('civicObjects').deleteOne({
      $or: [
        { _id: objectId },
        { id: id }
      ]
    });

    if (res.deletedCount === 0) {
      console.warn('⚠️ Object not found:', id);
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    console.log('✓ Civic object deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting object:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
