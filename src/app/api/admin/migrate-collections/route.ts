import clientPromise from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { CivicObject } from '@/types';

/**
 * MIGRATION ENDPOINT: Merges mapObjects + qrCodes into unified civicObjects collection
 * This should only be run ONCE during deployment
 * 
 * Steps:
 * 1. Copy all mapObjects to civicObjects (if not already migrated)
 * 2. Copy all qrCodes to civicObjects with qrCodeId field
 * 3. Archive old qrCodes to qrCodes_archive (for audit trail)
 * 4. Keep mapObjects for backward compatibility (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('civic-reporter');

    console.log('🔄 Starting collection migration: mapObjects + qrCodes → civicObjects');

    // Step 1: Check if civicObjects collection already exists and has data
    const civicObjectsCount = await db.collection('civicObjects').countDocuments();
    console.log(`📊 civicObjects collection current count: ${civicObjectsCount}`);

    // Step 2: Migrate mapObjects to civicObjects
    const mapObjectsCount = await db.collection('mapObjects').countDocuments();
    console.log(`📊 mapObjects collection count: ${mapObjectsCount}`);

    if (mapObjectsCount > 0) {
      const mapObjects = await db.collection('mapObjects').find({}).toArray();
      
      // Check which documents need migration
      const docsToInsert = [];
      for (const obj of mapObjects) {
        // Check if already in civicObjects
        const exists = await db.collection('civicObjects').findOne({ id: obj.id });
        if (!exists) {
          // Transform mapObject to CivicObject format
          const civicObject: CivicObject = {
            _id: obj._id,
            id: obj.id || `OBJ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            objectType: obj.objectType,
            location: obj.location,
            address: obj.address || '', // Keep existing address (even if empty)
            createdBy: obj.createdBy,
            createdAt: obj.createdAt
          };
          docsToInsert.push(civicObject);
        }
      }

      if (docsToInsert.length > 0) {
        const result = await db.collection<CivicObject>('civicObjects').insertMany(docsToInsert);
        console.log(`✓ Migrated ${result.insertedCount} mapObjects to civicObjects`);
      } else {
        console.log('✓ All mapObjects already in civicObjects (no new inserts needed)');
      }
    }

    // Step 3: Migrate qrCodes to civicObjects
    const qrCodesCount = await db.collection('qrCodes').countDocuments();
    console.log(`📊 qrCodes collection count: ${qrCodesCount}`);

    if (qrCodesCount > 0) {
      const qrCodes = await db.collection('qrCodes').find({}).toArray();

      const qrDocsToInsert = [];
      for (const qr of qrCodes) {
        // Check if already in civicObjects (by qrCodeId)
        const exists = await db.collection('civicObjects').findOne({ qrCodeId: qr.qrCodeId });
        if (!exists) {
          // Transform qrCode to CivicObject format
          const civicObject: CivicObject = {
            _id: qr._id,
            id: qr.qrCodeId, // Use QR ID as object ID
            qrCodeId: qr.qrCodeId, // Mark as QR-generated
            objectType: qr.objectType,
            location: qr.location,
            address: qr.objectLocation || qr.location?.coordinates ? `${qr.objectType} at ${qr.location.coordinates[1]}, ${qr.location.coordinates[0]}` : '', // Use objectLocation as address or construct from type
            createdBy: qr.createdBy,
            createdAt: qr.createdAt
          };
          qrDocsToInsert.push(civicObject);
        }
      }

      if (qrDocsToInsert.length > 0) {
        const result = await db.collection<CivicObject>('civicObjects').insertMany(qrDocsToInsert);
        console.log(`✓ Migrated ${result.insertedCount} qrCodes to civicObjects`);
      } else {
        console.log('✓ All qrCodes already in civicObjects (no new inserts needed)');
      }
    }

    // Step 4: Archive old qrCodes collection (rename to qrCodes_archive)
    const collections = await db.listCollections().toArray();
    const hasQrCodes = collections.some(c => c.name === 'qrCodes');
    const hasArchive = collections.some(c => c.name === 'qrCodes_archive');

    if (hasQrCodes && qrCodesCount > 0 && !hasArchive) {
      // Copy qrCodes to qrCodes_archive
      const allQRCodes = await db.collection('qrCodes').find({}).toArray();
      if (allQRCodes.length > 0) {
        await db.collection('qrCodes_archive').insertMany(allQRCodes);
        console.log(`✓ Archived ${allQRCodes.length} qrCodes to qrCodes_archive`);
      }
    }

    // Step 5: Verify migration
    const finalCivicObjectsCount = await db.collection('civicObjects').countDocuments();
    console.log(`📊 Final civicObjects count: ${finalCivicObjectsCount}`);

    // Get sample object
    const sampleObject = await db.collection<CivicObject>('civicObjects').findOne({});
    console.log('📍 Sample civicObject:', JSON.stringify(sampleObject, null, 2));

    // Verify geospatial index
    const indexes = await db.collection('civicObjects').listIndexes().toArray();
    console.log('📇 civicObjects indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));

    return NextResponse.json({
      success: true,
      message: 'Migration complete',
      stats: {
        mapObjectsMigrated: mapObjectsCount,
        qrCodesMigrated: qrCodesCount,
        finalCivicObjectsCount,
        archived: hasQrCodes && !hasArchive
      }
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
