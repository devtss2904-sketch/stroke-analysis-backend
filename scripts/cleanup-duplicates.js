const mongoose = require('mongoose');
const envConfig = require('../config/env.config');
const User = require('../models/user.model');
const Putter = require('../models/putter.model');
const PutterRecord = require('../models/putterRecord.model');
const {
  normalizeEmail,
  normalizePhone,
  extractSignificantDigits,
} = require('../utils/normalize');

async function cleanupAndEnforceUniqueness() {
  try {
    await mongoose.connect(envConfig.mongoUri);
    console.log('Connected to MongoDB:', envConfig.mongoUri);

    const users = await User.find({}).lean();
    console.log(`Analyzing ${users.length} existing users in database...`);

    // 1. Group users by normalized email
    const emailMap = new Map();
    // 2. Group users by normalized phone (or trailing 10 digits)
    const phoneMap = new Map();

    for (const u of users) {
      if (u.email) {
        const cleanE = normalizeEmail(u.email);
        if (cleanE) {
          if (!emailMap.has(cleanE)) emailMap.set(cleanE, []);
          emailMap.get(cleanE).push(u);
        }
      }

      if (u.phoneNumber) {
        const cleanP = normalizePhone(u.phoneNumber);
        const digits = extractSignificantDigits(u.phoneNumber);
        const key = digits && digits.length === 10 ? digits : cleanP;
        if (key) {
          if (!phoneMap.has(key)) phoneMap.set(key, []);
          phoneMap.get(key).push(u);
        }
      }
    }

    const duplicateEmails = Array.from(emailMap.entries()).filter(([_, list]) => list.length > 1);
    const duplicatePhones = Array.from(phoneMap.entries()).filter(([_, list]) => list.length > 1);

    console.log(`\nDuplicate email groups found: ${duplicateEmails.length}`);
    console.log(`Duplicate phone groups found: ${duplicatePhones.length}`);

    const idsToDelete = new Set();

    // Helper to pick primary record
    const pickPrimary = (list) => {
      // Sort by:
      // 1. status === 'active' > 'pending'
      // 2. isProfileComplete === true > false
      // 3. has firstName/lastName
      // 4. phone starts with '+' (international format preferred)
      // 5. oldest createdAt
      return [...list].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;

        if (a.isProfileComplete && !b.isProfileComplete) return -1;
        if (!a.isProfileComplete && b.isProfileComplete) return 1;

        const aName = (a.firstName || '') + (a.lastName || '');
        const bName = (b.firstName || '') + (b.lastName || '');
        if (aName && !bName) return -1;
        if (!aName && bName) return 1;

        const aHasPlus = (a.phoneNumber || '').startsWith('+');
        const bHasPlus = (b.phoneNumber || '').startsWith('+');
        if (aHasPlus && !bHasPlus) return -1;
        if (!aHasPlus && bHasPlus) return 1;

        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })[0];
    };

    // Process duplicate phone groups
    for (const [key, list] of duplicatePhones) {
      console.log(`\nResolving duplicate phone group for digits/key "${key}":`);
      list.forEach((u) =>
        console.log(`  - [ID: ${u._id}] Phone: "${u.phoneNumber}", Status: ${u.status}, Created: ${u.createdAt}`)
      );

      const primary = pickPrimary(list);
      console.log(`  => Retaining primary account: [ID: ${primary._id}] Phone: "${primary.phoneNumber}"`);

      for (const u of list) {
        if (u._id.toString() !== primary._id.toString()) {
          // Reassign any putters or records to primary
          const putterCount = await Putter.countDocuments({ userId: u._id });
          if (putterCount > 0) {
            await Putter.updateMany({ userId: u._id }, { userId: primary._id });
            console.log(`     Reassigned ${putterCount} putter(s) from ${u._id} to ${primary._id}`);
          }

          const recordCount = await PutterRecord.countDocuments({ userId: u._id });
          if (recordCount > 0) {
            await PutterRecord.updateMany({ userId: u._id }, { userId: primary._id });
            console.log(`     Reassigned ${recordCount} record(s) from ${u._id} to ${primary._id}`);
          }

          idsToDelete.add(u._id.toString());
        }
      }
    }

    // Process duplicate email groups (if any)
    for (const [email, list] of duplicateEmails) {
      console.log(`\nResolving duplicate email group for "${email}":`);
      list.forEach((u) =>
        console.log(`  - [ID: ${u._id}] Email: "${u.email}", Status: ${u.status}, Created: ${u.createdAt}`)
      );

      const primary = pickPrimary(list);
      console.log(`  => Retaining primary account: [ID: ${primary._id}] Email: "${primary.email}"`);

      for (const u of list) {
        if (u._id.toString() !== primary._id.toString()) {
          const putterCount = await Putter.countDocuments({ userId: u._id });
          if (putterCount > 0) {
            await Putter.updateMany({ userId: u._id }, { userId: primary._id });
          }

          const recordCount = await PutterRecord.countDocuments({ userId: u._id });
          if (recordCount > 0) {
            await PutterRecord.updateMany({ userId: u._id }, { userId: primary._id });
          }

          idsToDelete.add(u._id.toString());
        }
      }
    }

    // Execute deletion of duplicate placeholder records
    if (idsToDelete.size > 0) {
      console.log(`\nDeleting ${idsToDelete.size} duplicate user record(s)...`);
      const deleteResult = await User.deleteMany({ _id: { $in: Array.from(idsToDelete) } });
      console.log(`Deleted ${deleteResult.deletedCount} redundant document(s).`);
    } else {
      console.log('\nNo duplicate records required deletion.');
    }

    // Normalize all remaining phone numbers and emails in the DB
    console.log('\nStandardizing formats for all remaining user documents...');
    const remainingUsers = await User.find({});
    for (const u of remainingUsers) {
      let modified = false;

      if (u.email) {
        const cleanE = normalizeEmail(u.email);
        if (cleanE !== u.email) {
          u.email = cleanE;
          modified = true;
        }
      }

      if (u.phoneNumber) {
        const cleanP = normalizePhone(u.phoneNumber);
        if (cleanP !== u.phoneNumber) {
          u.phoneNumber = cleanP;
          modified = true;
        }
      }

      if (modified) {
        await u.save();
      }
    }

    // Drop old non-unique indexes on users collection
    console.log('\nDropping obsolete non-unique indexes on User collection...');
    const existingIndexes = await User.collection.indexes();
    for (const idx of existingIndexes) {
      if (['email_1', 'phoneNumber_1', 'googleId_1'].includes(idx.name)) {
        console.log(`Dropping legacy index: ${idx.name}`);
        await User.collection.dropIndex(idx.name);
      }
    }

    // Sync schema indexes to create the new unique partial indexes
    console.log('\nSynchronizing and building partial unique indexes...');
    await User.syncIndexes();

    const finalIndexes = await User.collection.indexes();
    console.log('\n=== FINAL ACTIVE INDEXES ON USER COLLECTION ===');
    console.log(JSON.stringify(finalIndexes, null, 2));

    const finalCount = await User.countDocuments();
    console.log(`\nCleanup & Index enforcement complete! Active user count: ${finalCount}`);
  } catch (err) {
    console.error('Error during cleanup and index enforcement:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
    process.exit(0);
  }
}

cleanupAndEnforceUniqueness();

