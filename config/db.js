const mongoose = require('mongoose');

let mongoServer;

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;

    // In production, NEVER fall back to memory server. It crashes Hostinger RAM.
    if (process.env.NODE_ENV === 'production') {
      try {
        await mongoose.connect(uri, { 
          serverSelectionTimeoutMS: 15000,
          family: 4 // Force IPv4 in case Hostinger DNS is failing on IPv6
        });
        console.log(`✅ MongoDB Production Connected: ${mongoose.connection.host}`);
        await autoSeed();
      } catch (err) {
        console.error('❌ CRITICAL DB ERROR:', err.message);
        global.dbError = err.message;
      }
      return;
    }

    // Development Mode: Try external MongoDB first
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
      await autoSeed();
      return;
    } catch (extErr) {
      console.log('⚠️  External MongoDB not available, starting in-memory server...');
    }

    // Fallback: use MongoDB Memory Server (Development Only)
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri; // Update for session store

    await mongoose.connect(uri);
    console.log(`✅ MongoDB Memory Server running at: ${uri}`);

    // Auto-seed when using memory server
    await autoSeed();

  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

async function autoSeed() {
  const Product = require('../models/Product');
  const count = await Product.countDocuments();
  if (count === 0) {
    console.log('📦 Auto-seeding database...');
    // Inline seed for memory server
    const seedData = require('../seed-data');
    await seedData();
    console.log('✅ Database seeded');
  }
}

module.exports = connectDB;
