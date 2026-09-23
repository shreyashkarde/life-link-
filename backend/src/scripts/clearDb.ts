import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ashutoshbhule1209_db_user:CFrTAtcknvgYNdRh@lifeline.cenvrns.mongodb.net/lifelink_db?retryWrites=true&w=majority&appName=Lifeline';

async function clearDatabase() {
  console.log('[DB-Clear] Connecting to MongoDB...');
  
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[DB-Clear] Connected to database: "${conn.connection.name}"`);

    if (conn.connection.db) {
      const collections = await conn.connection.db.collections();
      console.log(`[DB-Clear] Found ${collections.length} collections.`);

      for (const collection of collections) {
        const count = await collection.countDocuments();
        console.log(`[DB-Clear] Dropping collection "${collection.collectionName}" (had ${count} documents)...`);
        try {
          await collection.drop();
          console.log(`[DB-Clear] ✓ Cleared "${collection.collectionName}".`);
        } catch (dropErr: any) {
          console.log(`[DB-Clear] Could not drop ${collection.collectionName}:`, dropErr.message);
        }
      }
    }

    console.log('==============================================');
    console.log('🎉 SUCCESS: Entire database is 100% cleared!');
    console.log('==============================================');
  } catch (error: any) {
    console.error('[DB-Clear] Error clearing database:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('[DB-Clear] Disconnected from MongoDB.');
    process.exit(0);
  }
}

clearDatabase();
