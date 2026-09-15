import mongoose from 'mongoose';

const MessageItemSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const ConversationSchema = new mongoose.Schema(
  {
    conversationKey: {
      type: String,
      required: true,
      unique: true,
      index: true, // `${userId}_${chatId}`
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    chatId: {
      type: String,
      required: true,
      index: true,
    },
    chatType: {
      type: String,
      default: 'private',
    },
    messages: [MessageItemSchema],
    memorySizeBytes: {
      type: Number,
      default: 0,
    },
    summary: {
      type: String,
      default: '',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
