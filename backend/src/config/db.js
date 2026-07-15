const mongoose = require('mongoose');

const connectDB = async () => {
  // Try multiple environment variable names for MongoDB URI
  // Priority: MONGO_URI (set on Railway) > MONGO_URL (Railway fallback) > DATABASE_URL (Railway standard)
  const dbURI = process.env.MONGO_URI || process.env.MONGO_URL || process.env.DATABASE_URL;

  // Validate that we have a URI and it has the correct scheme
  if (!dbURI) {
    console.error('❌ Error: MongoDB URI is missing.');
    console.error('   Expected one of: MONGO_URI, MONGO_URL, or DATABASE_URL');
    console.error('   Available env vars:', Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DATABASE')));
    process.exit(1);
  }

  if (!dbURI.startsWith('mongodb://') && !dbURI.startsWith('mongodb+srv://')) {
    console.error('❌ Error: MongoDB URI has an invalid scheme.');
    console.error('   Expected to start with "mongodb://" or "mongodb+srv://"');
    console.error('   Got:', dbURI.substring(0, 50) + (dbURI.length > 50 ? '...' : ''));
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(dbURI, {
      // Connection options for better stability
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);

    // Drop the old unique index on { period: 1 } if it still exists.
    // The new partial index only enforces uniqueness for Salary runs.
    try {
      await conn.connection.collection('payrollruns').dropIndex('period_1');
      console.log('✅ Dropped legacy payrollruns period_1 index.');
    } catch (_) {
      // Index doesn't exist — nothing to do
    }
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('   Attempting to diagnose...');
    console.error('   Connection string:', dbURI.substring(0, 50) + (dbURI.length > 50 ? '...' : ''));
    process.exit(1);
  }
};

module.exports = connectDB;

