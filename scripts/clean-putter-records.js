const mongoose = require('mongoose');

async function cleanPutterRecords() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stroke_analysis_db';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.collection('putterrecords');
    const records = await collection.find({}).toArray();
    console.log(`Found ${records.length} putter records to clean.`);

    const fieldsToUnset = [
      'locationName',
      'sessionName',
      'backswingDistance',
      'impactSpeed',
      'accelerationAtImpact',
      'tempo',
      'tempoBack',
      'tempoDown',
      'metronome',
      'faceAngle',
      'swingPath',
      'shotResult',
      'connectionType',
      'batteryLevel',
      'deviceData',
      'rawPayload',
    ];

    for (const rec of records) {
      let deviceData = rec.data || rec.deviceData || {};
      
      // If data is empty, collect existing metric fields into data
      if (Object.keys(deviceData).length === 0) {
        fieldsToUnset.forEach(field => {
          if (rec[field] !== undefined && rec[field] !== null) {
            deviceData[field] = rec[field];
          }
        });
      }

      const unsetObj = {};
      fieldsToUnset.forEach(f => {
        unsetObj[f] = '';
      });

      await collection.updateOne(
        { _id: rec._id },
        {
          $set: { data: deviceData },
          $unset: unsetObj,
        }
      );
    }

    console.log('Finished updating putter records.');
    const sample = await collection.findOne({});
    console.log('Sample record after cleanup:', sample);
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

cleanPutterRecords();

