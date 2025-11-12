import clientPromise from '@/app/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('civic-reporter');

    // Check collections
    const collections = await db.listCollections().toArray();
    console.log('📦 Collections:', collections.map(c => c.name));

    // Check unified civicObjects collection
    const civicObjectsCount = await db.collection('civicObjects').countDocuments();
    const issuesCount = await db.collection('issues').countDocuments();
    
    // Check legacy collections for reference
    const mapObjectsCount = await db.collection('mapObjects').countDocuments();
    const qrCodesCount = await db.collection('qrCodes').countDocuments();
    const qrCodesArchiveCount = await db.collection('qrCodes_archive').countDocuments();

    console.log(`📊 civicObjects: ${civicObjectsCount}, issues: ${issuesCount}`);
    console.log(`📊 Legacy - mapObjects: ${mapObjectsCount}, qrCodes: ${qrCodesCount}, qrCodes_archive: ${qrCodesArchiveCount}`);

    // Get sample civicObject
    const sampleCivicObject = await db.collection('civicObjects').findOne({});
    console.log('📍 Sample civicObject:', JSON.stringify(sampleCivicObject, null, 2));

    // Check civicObjects indexes
    const civicObjectsIndexes = await db.collection('civicObjects').listIndexes().toArray();
    console.log('📇 civicObjects indexes:', civicObjectsIndexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Try a geospatial query (for verification, not production use)
    let geoResult = null;
    try {
      geoResult = await db.collection('civicObjects')
        .find({
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [77.5, 12.9]
              },
              $maxDistance: 10000
            }
          }
        })
        .limit(5)
        .toArray();
      console.log(`✓ Geospatial query found ${geoResult.length} objects`);
    } catch (geoError) {
      console.error('❌ Geospatial query failed:', geoError);
    }

    // Check sample issues
    const sampleIssue = await db.collection('issues').findOne({});
    console.log('📋 Sample issue:', JSON.stringify(sampleIssue, null, 2));

    return NextResponse.json({
      status: 'OK',
      collections: collections.map(c => c.name),
      counts: {
        civicObjects: civicObjectsCount,
        issues: issuesCount,
        legacy: {
          mapObjects: mapObjectsCount,
          qrCodes: qrCodesCount,
          qrCodes_archive: qrCodesArchiveCount
        }
      },
      samples: {
        civicObject: sampleCivicObject,
        issue: sampleIssue
      },
      indexes: {
        civicObjects: civicObjectsIndexes.map(idx => ({ name: idx.name, key: idx.key }))
      },
      geoQueryResult: geoResult
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
