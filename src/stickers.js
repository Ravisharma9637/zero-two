export const ALL_PACKS = [
  'Snowww41',
  'Zero_two_Hanim1O_by_fStikBot',
  'Meikai8',
  't_me_addstickerieiieieieieieiieieieirididicigir_by_fStikBot',
  'GpvtfSG_by_sticbot',
  'Hiroxzerotwo02',
];

export const moodEmojis = {
  laughing: ['😂', '🤣', '😹', '😆'],
  sad: ['😭', '😢', '🥺', '😿'],
  love: ['😍', '🥰', '❤️', '💕', '💗'],
  angry: ['😡', '💢', '😤', '🔥'],
  bored: ['😴', '💤', '😑'],
  happy: ['😊', '😄', '🙂', '✨'],
  thinking: ['🤔', '🧐', '💭'],
  smug: ['😏', '😈', '😼'],
  wave: ['👋', '🤗'],
  hug: ['🤗', '💕', '🫂'],
  unimpressed: ['🙄', '😑', '💀'],
  dead: ['💀', '😵'],
  silly: ['🤡', '😜', '😝'],
  hype: ['🔥', '✨', '🎉'],
  surprised: ['😳', '😮', '😲'],
  awkward: ['😅', '😬'],
  shy: ['🤭', '😳', '🫣'],
  neutral: [],
};

// In-memory cache for sticker sets
const stickerCache = new Map();
let allLoadedStickers = [];

/**
 * Fetches a single sticker set from Telegram and caches it
 */
export async function fetchStickerSet(bot, packName) {
  if (!bot) return null;
  if (stickerCache.has(packName)) {
    return stickerCache.get(packName);
  }

  try {
    const stickerSet = await bot.getStickerSet(packName);
    if (stickerSet && stickerSet.stickers && stickerSet.stickers.length > 0) {
      stickerCache.set(packName, stickerSet);
      return stickerSet;
    }
  } catch (err) {
    console.warn(`[Stickers] Could not load sticker pack "${packName}":`, err.message);
  }
  return null;
}

/**
 * Preloads all configured sticker packs into memory
 */
export async function preloadPacks(bot) {
  if (!bot) return;
  console.log('[Stickers] Preloading Zero Two sticker packs...');
  allLoadedStickers = [];

  for (const pack of ALL_PACKS) {
    try {
      const set = await fetchStickerSet(bot, pack);
      if (set && set.stickers) {
        allLoadedStickers.push(...set.stickers);
        console.log(`[Stickers] Loaded pack "${pack}" (${set.stickers.length} stickers)`);
      }
    } catch (e) {
      console.warn(`[Stickers] Error preloading pack ${pack}:`, e.message);
    }
  }

  console.log(`[Stickers] Finished preloading. Total cached stickers: ${allLoadedStickers.length}`);
}

/**
 * Maps an incoming emoji character to a recognized mood
 */
export function getMoodFromEmoji(emojiChar) {
  if (!emojiChar) return 'neutral';

  for (const [mood, emojis] of Object.entries(moodEmojis)) {
    if (emojis.some((e) => emojiChar.includes(e) || e.includes(emojiChar))) {
      return mood;
    }
  }
  return 'neutral';
}

/**
 * Selects a sticker from the loaded cache matching a mood, or a random sticker
 */
export function getStickerForMood(targetMood = 'neutral') {
  if (allLoadedStickers.length === 0) {
    return null;
  }

  const desiredMood = targetMood || 'neutral';

  // If a specific mood is requested (not neutral), find stickers that have matching emojis
  if (desiredMood !== 'neutral' && moodEmojis[desiredMood]) {
    const matchingEmojis = moodEmojis[desiredMood];
    const candidates = allLoadedStickers.filter((stk) =>
      stk.emoji && matchingEmojis.some((e) => stk.emoji.includes(e) || e.includes(stk.emoji))
    );

    if (candidates.length > 0) {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      return candidates[randomIndex].file_id;
    }
  }

  // Fallback to random sticker from the preloaded collection
  const fallbackIndex = Math.floor(Math.random() * allLoadedStickers.length);
  return allLoadedStickers[fallbackIndex].file_id;
}
