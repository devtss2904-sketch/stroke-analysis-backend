const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // Screen 2: Get started 1 (Profile photo)
    profilePhoto: {
      type: String,
      default: null,
      trim: true,
    },

    // Screen 3: Get started 2 (Personal Info)
    firstName: {
      type: String,
      trim: true,
      default: '',
    },
    lastName: {
      type: String,
      trim: true,
      default: '',
    },
    birthday: {
      type: Date,
      default: null,
    },

    // Screen 4: Get started 3 (Contact & Address Info)
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    zipCode: {
      type: String,
      trim: true,
      default: '',
    },

    // Auth & Status fields
    authProvider: {
      type: String,
      enum: ['email', 'phone', 'google'],
      default: 'email',
    },
    googleId: {
      type: String,
      trim: true,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'suspended'],
      default: 'pending',
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || '';
});

// Enforce unique non-empty email across collection
userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string', $gt: '' } },
  }
);

// Enforce unique non-empty phone number across collection
userSchema.index(
  { phoneNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { phoneNumber: { $type: 'string', $gt: '' } },
  }
);

// Enforce unique non-empty Google ID across collection
userSchema.index(
  { googleId: 1 },
  {
    unique: true,
    partialFilterExpression: { googleId: { $type: 'string', $gt: '' } },
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;

