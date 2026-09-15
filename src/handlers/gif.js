import { getStickerForMood } from '../stickers.js';
import { syncUserRecord } from '../memory.js';

export async function handleGifMessage(bot, msg) {
  // Telegram sends GIFs either as animation or document with video/gif mime
  const isAnimation = Boolean(msg.animation);
  const isGifDoc = msg.document && (msg.document.mime_type === 'image/gif' || msg.document.mime_type === 'video/mp4');

  if (!isAnimation && !isGifDoc) return;

  const chatId = msg.chat.id;
  const isPrivate = msg.chat.type === 'private';

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

  // For GIFs, choose a playful, hype, or smug Zero Two sticker
  const animatedMoods = ['hype', 'smug', 'happy', 'laughing', 'love'];
  const chosenMood = animatedMoods[Math.floor(Math.random() * animatedMoods.length)];
  const stickerId = getStickerForMood(chosenMood);

  if (stickerId) {
    try {
      await bot.sendSticker(chatId, stickerId, {
        reply_to_message_id: msg.message_id,
      });
    } catch (err) {
      console.warn('[GifHandler] Failed to send sticker response to GIF:', err.message);
    }
  }
}
