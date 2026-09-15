import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    telegramId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      default: '',
    },
    firstName: {
      type: String,
      default: '',
    },
    lastName: {
      type: String,
      default: '',
    },
    chatIds: {
      type: [String],
      default: [],
    },
    isSpecialUser: {
      type: Boolean,
      default: false,
    },
    relationshipStatus: {
      type: String,
      enum: ['darling', 'friend', 'normal'],
      default: 'normal',
    },
    memorySizeBytes: {
      type: Number,
      default: 0,
    },
    lastInteraction: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
