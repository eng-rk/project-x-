const mongoose = require('mongoose');

// Helper to mask MongoDB URI credentials for security logs
const maskUri = (uri) => {
  if (!uri || typeof uri !== 'string') return 'N/A';
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.*)$/);
  if (match) {
    return `${match[1]}${match[2]}:****@${match[4]}`;
  }
  return uri;
};

const isValidUri = (uri) => {
  return uri && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'));
};

const connectDB = async () => {
  let connectionString = process.env.MONGO_URI;

  if (!isValidUri(connectionString)) {
    const fallbacks = [
      process.env.MONGO_URL,
      process.env.DATABASE_URL,
      process.env.MONGODB_URI,
      process.env.MONGO_PRIVATE_URL
    ];
    for (const fallback of fallbacks) {
      if (isValidUri(fallback)) {
        connectionString = fallback;
        break;
      }
    }
  }

  if (!isValidUri(connectionString)) {
    console.error("❌ DEPLOYMENT ERROR: No valid MongoDB connection string was found in environment variables. Please check Railway Variables tab.");
    console.error("   Expected one of: MONGO_URI, MONGO_URL, DATABASE_URL, MONGODB_URI, or MONGO_PRIVATE_URL");
    console.error("   Available env vars:", Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DATABASE')));
    return Promise.reject(new Error("No valid MongoDB connection string found."));
  }

  try {
    console.log(`Attempting to connect to MongoDB using URI: ${maskUri(connectionString)}`);
    const conn = await mongoose.connect(connectionString, {
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
    console.error(`   Attempted Connection URI: ${maskUri(connectionString)}`);
    return Promise.reject(error);
  }
};

module.exports = connectDB;


