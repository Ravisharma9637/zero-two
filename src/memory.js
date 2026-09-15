import { Conversation } from './models/Conversation.js';
import { User } from './models/User.js';
import { config } from './config.js';
import { getDatabaseStatus } from './database.js';

// In-memory fallback if MongoDB is offline or unconfigured
const inMemoryStore = new Map();

/**
 * Calculates byte size of an object or string
 */
function calculateByteSize(object) {
  try {
    return Buffer.byteLength(JSON.stringify(object), 'utf8');
  } catch {
    return 0;
  }
}

/**
 * Ensures user record exists or is updated in MongoDB
 */
export async function syncUserRecord(fromUser, chatId) {
  if (!fromUser || !fromUser.id) return;
  const userId = String(fromUser.id);
  const isDarling = config.specialUserId === userId;

  if (getDatabaseStatus() !== 'connected') {
    return;
  }

  try {
    await User.findOneAndUpdate(
      { telegramId: userId },
      {
        $set: {
          username: fromUser.username || '',
          firstName: fromUser.first_name || '',
          lastName: fromUser.last_name || '',
          isSpecialUser: isDarling,
          relationshipStatus: isDarling ? 'darling' : 'normal',
          lastInteraction: new Date(),
        },
        $addToSet: { chatIds: String(chatId) },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn('[Memory] Failed to sync user record:', err.message);
  }
}

/**
 * Retrieves conversation context for a given user and chat
 */
export async function getConversationContext(userId, chatId, limit = 10) {
  const conversationKey = `${userId}_${chatId}`;

  if (getDatabaseStatus() === 'connected') {
    try {
      let conv = await Conversation.findOne({ conversationKey });
      if (!conv) {
        return [];
      }

      // Check if memory exceeded 10 MB limit
      if (conv.memorySizeBytes > config.maxMemoryBytes) {
        console.warn(`[Memory] Conversation ${conversationKey} exceeded 10MB (${conv.memorySizeBytes} bytes). Auto-clearing history.`);
        conv.messages = [];
        conv.memorySizeBytes = 0;
        conv.summary = '';
        await conv.save();
        return [];
      }

      // Return recent messages up to the limit
      const messages = conv.messages || [];
      return messages.slice(-limit).map((m) => ({
        role: m.role,
        content: m.content,
      }));
    } catch (err) {
      console.warn('[Memory] DB fetch failed, falling back to memory store:', err.message);
    }
  }

  // In-memory fallback
  const cached = inMemoryStore.get(conversationKey) || [];
  return cached.slice(-limit);
}

/**
 * Saves a user and assistant exchange to the conversation history
 */
export async function saveMessageExchange(userId, chatId, chatType, userText, assistantText) {
  const conversationKey = `${userId}_${chatId}`;
  const newMessages = [
    { role: 'user', content: userText, timestamp: new Date() },
    { role: 'assistant', content: assistantText, timestamp: new Date() },
  ];

  if (getDatabaseStatus() === 'connected') {
    try {
      let conv = await Conversation.findOne({ conversationKey });
      if (!conv) {
        conv = new Conversation({
          conversationKey,
          userId: String(userId),
          chatId: String(chatId),
          chatType: chatType || 'private',
          messages: [],
          memorySizeBytes: 0,
        });
      }

      // Append messages
      conv.messages.push(...newMessages);

      // Recalculate size
      const currentSize = calculateByteSize(conv.messages);
      conv.memorySizeBytes = currentSize;
      conv.lastUpdated = new Date();

      // Check 10 MB limit rule:
      // "When a user's memory exceeds 10 MB: DELETE THE USER'S HISTORY.
      // Do not delete the user's account/profile metadata unless necessary.
      // Only clear the conversation history/memory. After clearing memory, start a fresh conversation context."
      if (currentSize > config.maxMemoryBytes) {
        console.warn(`[Memory] Limit exceeded (>10MB) for conversation ${conversationKey}. Purging message history.`);
        conv.messages = [];
        conv.memorySizeBytes = 0;
        conv.summary = '';
      }

      await conv.save();
      return;
    } catch (err) {
      console.warn('[Memory] DB save failed, saving to in-memory store:', err.message);
    }
  }

  // In-memory fallback handling
  let list = inMemoryStore.get(conversationKey) || [];
  list.push({ role: 'user', content: userText }, { role: 'assistant', content: assistantText });

  // Keep in-memory store bounded
  if (list.length > 50) {
    list = list.slice(-30);
  }
  inMemoryStore.set(conversationKey, list);
}

/**
 * Explicitly clears memory for a user in a specific chat
 */
export async function clearConversationMemory(userId, chatId) {
  const conversationKey = `${userId}_${chatId}`;
  inMemoryStore.delete(conversationKey);

  if (getDatabaseStatus() === 'connected') {
    try {
      await Conversation.findOneAndUpdate(
        { conversationKey },
        { $set: { messages: [], memorySizeBytes: 0, summary: '' } }
      );
      return true;
    } catch (err) {
      console.warn('[Memory] Failed to clear DB conversation:', err.message);
      return false;
    }
  }
  return true;
}
