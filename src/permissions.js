import { config } from './config.js';

/**
 * Checks the permission level of a user in a chat
 * Returns:
 *   3 - Special User / Darling (Allowed everywhere)
 *   2 - Telegram Admin / Creator
 *   1 - Normal user
 */
export async function getPermissionLevel(bot, chatId, userId) {
  const strUserId = String(userId);

  // Level 3: Special User / Darling
  if (config.specialUserId && strUserId === config.specialUserId) {
    return 3;
  }

  // If in private chat, there are no group admin hierarchies
  try {
    const chatMember = await bot.getChatMember(chatId, userId);
    if (chatMember && ['creator', 'administrator'].includes(chatMember.status)) {
      return 2;
    }
  } catch (err) {
    console.warn(`[Permissions] Error checking member status for ${userId} in ${chatId}:`, err.message);
  }

  // Level 1: Normal user
  return 1;
}

/**
 * Checks if the bot itself has administrator rights in the chat to perform moderation
 */
export async function checkBotAdminRights(bot, chatId) {
  try {
    const me = await bot.getMe();
    const botMember = await bot.getChatMember(chatId, me.id);
    return botMember && botMember.status === 'administrator';
  } catch (err) {
    console.warn(`[Permissions] Failed to check bot admin status in ${chatId}:`, err.message);
    return false;
  }
}

/**
 * Resolves target user from either a message reply or command arguments (@username or userId)
 */
export async function resolveTargetUser(bot, msg, matchArgs) {
  // 1. Preferred method: Reply to message
  if (msg.reply_to_message && msg.reply_to_message.from) {
    return {
      user: msg.reply_to_message.from,
      source: 'reply',
    };
  }

  // 2. Argument method: @username or user ID
  if (matchArgs) {
    const cleanArg = matchArgs.trim().split(' ')[0];
    if (cleanArg.startsWith('@')) {
      const username = cleanArg.slice(1).toLowerCase();
      return {
        username,
        user: null,
        source: 'username',
      };
    } else if (/^\d+$/.test(cleanArg)) {
      return {
        userId: cleanArg,
        user: { id: cleanArg, first_name: `User ${cleanArg}` },
        source: 'id',
      };
    }
  }

  return null;
}

/**
 * Checks if target is protected from moderation
 */
export async function isProtectedTarget(bot, chatId, targetUserId) {
  const strTargetId = String(targetUserId);

  // 1. Protect Darling / Special User
  if (config.specialUserId && strTargetId === config.specialUserId) {
    return {
      protected: true,
      reason: "Hmp! I'm not doing that to my Darling! Are you crazy?! 😤 meowww",
    };
  }

  // 2. Protect the Bot itself
  try {
    const me = await bot.getMe();
    if (strTargetId === String(me.id)) {
      return {
        protected: true,
        reason: "Why would I do that to myself, dummy? 😏 meowww",
      };
    }
  } catch {}

  // 3. Protect Chat Creator / Owner
  try {
    const member = await bot.getChatMember(chatId, targetUserId);
    if (member && member.status === 'creator') {
      return {
        protected: true,
        reason: "I can't touch the group owner! Even I have limits~ 🙄 meowww",
      };
    }
  } catch {}

  return { protected: false };
}
