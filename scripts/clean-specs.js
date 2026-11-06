const mongoose = require('mongoose');

async function cleanSpecs() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stroke_analysis_db';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.collection('putters');
    const totalPutters = await collection.countDocuments();
    console.log(`Total putters found: ${totalPutters}`);

    const result = await collection.updateMany(
      {},
      { $unset: { specs: '' } }
    );
    console.log(`Successfully unset specs from putters. Modified count: ${result.modifiedCount}`);

    const sample = await collection.findOne({});
    console.log('Sample putter document after cleanup:', sample);
  } catch (err) {
    console.error('Error cleaning specs:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

cleanSpecs();

