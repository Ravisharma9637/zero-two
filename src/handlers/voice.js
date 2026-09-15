import { transcribeVoiceMessage } from '../voice.js';
import { generateZeroTwoResponse } from '../ai.js';
import { getConversationContext, saveMessageExchange, syncUserRecord } from '../memory.js';
import { getStickerForMood } from '../stickers.js';
import { config } from '../config.js';

export async function handleVoiceMessage(bot, msg) {
  if (!msg.voice) return;

  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const isPrivate = msg.chat.type === 'private';
  const isDarling = String(userId) === config.specialUserId;

  // Group check
  if (!isPrivate && msg.reply_to_message) {
    try {
      const me = await bot.getMe();
      if (msg.reply_to_message.from?.id !== me.id) {
        return;
      }
    } catch {}
  }

  syncUserRecord(msg.from, chatId).catch(() => {});

  // Show typing or record_voice action
  bot.sendChatAction(chatId, 'typing').catch(() => {});

  // Step 1 & 2: Download & Transcribe
  const transcribedText = await transcribeVoiceMessage(bot, msg.voice.file_id);

  // Fallback if transcription failed or STT not configured
  if (!transcribedText) {
    const fallbackText = isDarling
      ? "I couldn't quite hear that, darling~ try sending it again 🥺 meowww"
      : "I couldn't quite hear that! Try sending it again 🥺";

    return bot.sendMessage(chatId, fallbackText, {
      reply_to_message_id: msg.message_id,
    });
  }

  // Step 3: AI Processing with history
  try {
    const history = await getConversationContext(userId, chatId, 10);
    const replyText = await generateZeroTwoResponse(transcribedText, history, isDarling);

    await saveMessageExchange(userId, chatId, msg.chat.type, `[Voice message: "${transcribedText}"]`, replyText);

    // Send AI reply as text
    await bot.sendMessage(chatId, replyText, {
      reply_to_message_id: msg.message_id,
    });

    // Optionally send an accompanying sticker (50% chance)
    if (Math.random() > 0.5) {
      const stickerId = getStickerForMood('love');
      if (stickerId) {
        await bot.sendSticker(chatId, stickerId);
      }
    }
  } catch (err) {
    console.error('[VoiceHandler] Error processing voice response:', err.message);
    const errText = isDarling
      ? "Darling, I heard you but my words got tangled~ say it again? 🥺 meowww"
      : "Couldn't process that properly! Try asking again 😏";

    bot.sendMessage(chatId, errText, { reply_to_message_id: msg.message_id }).catch(() => {});
  }
}
