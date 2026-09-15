import { getMoodFromEmoji, getStickerForMood } from '../stickers.js';
import { syncUserRecord } from '../memory.js';

export async function handleStickerMessage(bot, msg) {
  if (!msg.sticker) return;

  const chatId = msg.chat.id;
  const isPrivate = msg.chat.type === 'private';

  // In groups, only respond if sticker was in reply to bot or direct
  if (!isPrivate && msg.reply_to_message) {
    try {
      const me = await bot.getMe();
      if (msg.reply_to_message.from?.id !== me.id) {
        return;
      }
    } catch {}
  } else if (!isPrivate && !msg.reply_to_message) {
    // Random 20% chance to react in groups or ignore to avoid spamming
    if (Math.random() > 0.25) return;
  }

  syncUserRecord(msg.from, chatId).catch(() => {});

  const emoji = msg.sticker.emoji || '';
  const mood = getMoodFromEmoji(emoji);
  const stickerId = getStickerForMood(mood);

  if (stickerId) {
    try {
      await bot.sendSticker(chatId, stickerId, {
        reply_to_message_id: msg.message_id,
      });
    } catch (err) {
      console.warn('[StickerHandler] Failed to send sticker:', err.message);
    }
  }
}
