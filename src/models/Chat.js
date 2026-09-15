import mongoose from 'mongoose';

const MuteRecordSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    default: '',
  },
  mutedAt: {
    type: Date,
    default: Date.now,
  },
  untilDate: {
    type: Date,
    default: null, // null means permanent until /unmute
  },
  mutedBy: {
    type: String,
    default: '',
  },
});

const ChatSchema = new mongoose.Schema(
  {
    chatId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['private', 'group', 'supergroup', 'channel'],
      default: 'group',
    },
    title: {
      type: String,
      default: '',
    },
    settings: {
      groupResponseMode: {
        type: String,
        enum: ['smart', 'always', 'mentions_only'],
        default: 'smart',
      },
      stickerRepliesEnabled: {
        type: Boolean,
        default: true,
      },
      voiceRepliesEnabled: {
        type: Boolean,
        default: true,
      },
    },
    activeMutes: [MuteRecordSchema],
  },
  {
    timestamps: true,
  }
);

export const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);
