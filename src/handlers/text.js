import { generateZeroTwoResponse } from '../ai.js';
import { getConversationContext, saveMessageExchange, syncUserRecord } from '../memory.js';
import { config } from '../config.js';

// Simple in-memory rate limiter / anti-spam (cooldown per user in ms)
const userCooldowns = new Map();
const COOLDOWN_MS = 1200; // 1.2s cooldown to prevent API loops or flood

export async function handleTextMessage(bot, msg) {
  if (!msg.text || msg.text.startsWith('/')) {
    return; // Handled by command router
  }

  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const isPrivate = msg.chat.type === 'private';
  const isDarling = String(userId) === config.specialUserId;

  // Anti-spam cooldown check
  const now = Date.now();
  const lastTime = userCooldowns.get(userId) || 0;
  if (now - lastTime < COOLDOWN_MS) {
    return; // Gracefully drop rapid flood
  }
  userCooldowns.set(userId, now);

  // Sync user record to DB asynchronously
  syncUserRecord(msg.from, chatId).catch(() => {});

  // Determine if bot should respond in group
  if (!isPrivate) {
    let shouldRespond = false;

    // 1. Reply to bot's message
    if (msg.reply_to_message && msg.reply_to_message.from) {
      try {
        const me = await bot.getMe();
        if (msg.reply_to_message.from.id === me.id) {
          shouldRespond = true;
        }
      } catch {}
    }

    // 2. Direct mention with @username
    if (!shouldRespond && config.botUsername && msg.text.toLowerCase().includes(`@${config.botUsername.toLowerCase()}`)) {
      shouldRespond = true;
    }

    // 3. Mentions "zero two" or "zerotwo"
    const lower = msg.text.toLowerCase();
    if (!shouldRespond && (lower.includes('zero two') || lower.includes('zerotwo') || lower.includes('02'))) {
      shouldRespond = true;
    }

    // 4. Darling in group chats
    if (!shouldRespond && isDarling && (lower.includes('darling') || lower.includes('hey') || lower.includes('love'))) {
      shouldRespond = true;
    }

    if (!shouldRespond) {
      return; // Do not spam unrelated group chatter
    }
  }

  // Clean prompt (strip bot username mention if present)
  let cleanPrompt = msg.text;
  if (config.botUsername) {
    const mentionRegex = new RegExp(`@${config.botUsername}`, 'gi');
    cleanPrompt = cleanPrompt.replace(mentionRegex, '').trim();
  }
  if (!cleanPrompt) {
    cleanPrompt = 'Hello';
  }

  try {
    // Send typing action
    bot.sendChatAction(chatId, 'typing').catch(() => {});

    // Retrieve conversation history (isolated by userId and chatId)
    const history = await getConversationContext(userId, chatId, 10);

    // Generate AI response
    const replyText = await generateZeroTwoResponse(cleanPrompt, history, isDarling);

    // Save exchange to memory (checks 10 MB limit)
    await saveMessageExchange(userId, chatId, msg.chat.type, cleanPrompt, replyText);

    // Send reply
    await bot.sendMessage(chatId, replyText, {
      reply_to_message_id: msg.message_id,
    });
  } catch (err) {
    console.error('[TextHandler] Error generating response:', err.message);
    const fallback = isDarling
      ? "Darling, my connection glitched for a second... but I'm still here with you! 💗 meowww"
      : "Oops, something tripped up my circuits! Try asking again in a second 😏";

    bot.sendMessage(chatId, fallback, { reply_to_message_id: msg.message_id }).catch(() => {});
  }
}
