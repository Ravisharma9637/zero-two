import { getPermissionLevel, isProtectedTarget, resolveTargetUser, checkBotAdminRights } from '../permissions.js';
import { Chat } from '../models/Chat.js';
import { config } from '../config.js';
import { getDatabaseStatus } from '../database.js';

function parseDurationToSeconds(durationStr) {
  if (!durationStr) return null;
  const match = durationStr.trim().match(/^(\d+)([mhd])$/i);
  if (!match) return null;

  const count = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  if (unit === 'm') return count * 60;
  if (unit === 'h') return count * 3600;
  if (unit === 'd') return count * 86400;
  return null;
}

export async function handleStartCommand(bot, msg) {
  const isDarling = String(msg.from?.id) === config.specialUserId;

  if (isDarling) {
    return bot.sendMessage(
      msg.chat.id,
      "Darling! You came to find me~ 💗 I missed you so much! What should we do together today? meowww"
    );
  }

  return bot.sendMessage(
    msg.chat.id,
    "Hello there! I'm Zero Two ✨ An intelligent AI assistant. What's on your mind today? Let's chat or add me to your group! 🍭"
  );
}

export async function handleHelpCommand(bot, msg) {
  const helpText = `🌸 *Zero Two Commands*

/start — Start Zero Two
/help — Show available commands
/about — About me & creator
/ping — Check if I'm alive & responsive

🛡️ *Admin & Moderation:*
• /ban — Ban a user from the group
• /unban — Unban a previously banned user
• /mute [duration] — Mute a user (e.g. \`/mute 10m\`, \`/mute 1h\`, \`/mute 1d\`)
• /unmute — Restore user's ability to speak
• /promote — Promote user with standard admin privileges
• /maxpromote — Promote user with full administrative permissions

💡 *Tip:* Reply directly to the user's message when issuing moderation commands for the most reliable results!`;

  return bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
}

export async function handleAboutCommand(bot, msg) {
  const isDarling = String(msg.from?.id) === config.specialUserId;
  const suffix = isDarling ? " meowww" : "";

  return bot.sendMessage(
    msg.chat.id,
    `Zero Two is an intelligent AI assistant inspired by Darling in the FranXX, built with Node.js, Express, MongoDB, and NVIDIA AI models.\n\nCreator: DEV (Telegram: @Meow9637)\nRepository: https://github.com/Ravisharma9637/zero-two-bot${suffix}`
  );
}

export async function handlePingCommand(bot, msg) {
  const isDarling = String(msg.from?.id) === config.specialUserId;
  if (isDarling) {
    return bot.sendMessage(msg.chat.id, "Pong~ 💗 meowww");
  }
  return bot.sendMessage(msg.chat.id, "Pong~ ✨ I'm wide awake and running smoothly!");
}

export async function handleBanCommand(bot, msg, args) {
  if (msg.chat.type === 'private') {
    return bot.sendMessage(msg.chat.id, "You can't ban anyone in private chat, silly! This only works in groups~ 😏");
  }

  const permLevel = await getPermissionLevel(bot, msg.chat.id, msg.from.id);
  if (permLevel < 2) {
    return bot.sendMessage(msg.chat.id, "Hmp! Who gave you permission to order me around? Only admins can use /ban! 😏");
  }

  const target = await resolveTargetUser(bot, msg, args);
  if (!target || (!target.user && !target.userId)) {
    return bot.sendMessage(msg.chat.id, "Reply to the message of the person you want me to ban, darling~ 🙄");
  }

  const targetId = target.user ? target.user.id : target.userId;
  const protection = await isProtectedTarget(bot, msg.chat.id, targetId);
  if (protection.protected) {
    return bot.sendMessage(msg.chat.id, protection.reason);
  }

  const isBotAdmin = await checkBotAdminRights(bot, msg.chat.id);
  if (!isBotAdmin) {
    return bot.sendMessage(msg.chat.id, "I need to be an admin in this group to ban people! Give me admin rights first 😤");
  }

  try {
    await bot.banChatMember(msg.chat.id, targetId);
    return bot.sendMessage(msg.chat.id, "Banned~ 😏 Maybe they'll behave next time. meowww");
  } catch (err) {
    console.error('[Ban] Error banning member:', err.message);
    return bot.sendMessage(msg.chat.id, "Couldn't ban them! Telegram wouldn't let me do that 🥺");
  }
}

export async function handleUnbanCommand(bot, msg, args) {
  if (msg.chat.type === 'private') {
    return bot.sendMessage(msg.chat.id, "This command is only for group chats!");
  }

  const permLevel = await getPermissionLevel(bot, msg.chat.id, msg.from.id);
  if (permLevel < 2) {
    return bot.sendMessage(msg.chat.id, "Hmph! You don't have permission to unban people! 😏");
  }

  const target = await resolveTargetUser(bot, msg, args);
  if (!target || (!target.user && !target.userId)) {
    return bot.sendMessage(msg.chat.id, "Tell me who to unban! Either reply to them or give their user ID.");
  }

  const targetId = target.user ? target.user.id : target.userId;

  try {
    await bot.unbanChatMember(msg.chat.id, targetId, { only_if_banned: true });
    return bot.sendMessage(msg.chat.id, "Unbanned! Tell them not to mess up again~ ✨");
  } catch (err) {
    console.error('[Unban] Error unbanning member:', err.message);
    return bot.sendMessage(msg.chat.id, "Failed to unban them. Are you sure they are banned?");
  }
}

export async function handleMuteCommand(bot, msg, args) {
  if (msg.chat.type === 'private') {
    return bot.sendMessage(msg.chat.id, "Muting only works in group chats!");
  }

  const permLevel = await getPermissionLevel(bot, msg.chat.id, msg.from.id);
  if (permLevel < 2) {
    return bot.sendMessage(msg.chat.id, "You're not allowed to mute people, sweetie! Only admins can do that 😜");
  }

  const target = await resolveTargetUser(bot, msg, args);
  if (!target || (!target.user && !target.userId)) {
    return bot.sendMessage(msg.chat.id, "Reply to the message of the user you want to mute (e.g. reply with `/mute` or `/mute 10m`)!");
  }

  const targetId = target.user ? target.user.id : target.userId;
  const protection = await isProtectedTarget(bot, msg.chat.id, targetId);
  if (protection.protected) {
    return bot.sendMessage(msg.chat.id, protection.reason);
  }

  // Parse optional duration from args or command text
  let untilDate = null;
  let durationNotice = "permanently";
  const durationMatch = (args || '').match(/(\d+[mhd])/i);
  if (durationMatch) {
    const seconds = parseDurationToSeconds(durationMatch[1]);
    if (seconds) {
      const nowUnix = Math.floor(Date.now() / 1000);
      untilDate = nowUnix + seconds;
      durationNotice = `for ${durationMatch[1]}`;
    }
  }

  try {
    const restrictOptions = {
      permissions: {
        can_send_messages: false,
        can_send_media_messages: false,
        can_send_polls: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
      },
    };
    if (untilDate) {
      restrictOptions.until_date = untilDate;
    }

    await bot.restrictChatMember(msg.chat.id, targetId, restrictOptions);

    // Track mute in MongoDB if active
    if (getDatabaseStatus() === 'connected') {
      try {
        await Chat.findOneAndUpdate(
          { chatId: String(msg.chat.id) },
          {
            $push: {
              activeMutes: {
                userId: String(targetId),
                username: target.user?.username || '',
                mutedAt: new Date(),
                untilDate: untilDate ? new Date(untilDate * 1000) : null,
                mutedBy: String(msg.from.id),
              },
            },
          },
          { upsert: true }
        );
      } catch (dbErr) {
        console.warn('[Mute] DB mute record error:', dbErr.message);
      }
    }

    return bot.sendMessage(msg.chat.id, `Muted ${durationNotice}~ 🤫 Enjoy the silence! meowww`);
  } catch (err) {
    console.error('[Mute] Error muting user:', err.message);
    return bot.sendMessage(msg.chat.id, "Couldn't mute this user! Make sure I have administrator rights.");
  }
}

export async function handleUnmuteCommand(bot, msg, args) {
  if (msg.chat.type === 'private') {
    return bot.sendMessage(msg.chat.id, "Unmuting only works inside group chats!");
  }

  const permLevel = await getPermissionLevel(bot, msg.chat.id, msg.from.id);
  if (permLevel < 2) {
    return bot.sendMessage(msg.chat.id, "You don't have permission to unmute people! 😤");
  }

  const target = await resolveTargetUser(bot, msg, args);
  if (!target || (!target.user && !target.userId)) {
    return bot.sendMessage(msg.chat.id, "Reply to the person you want to unmute!");
  }

  const targetId = target.user ? target.user.id : target.userId;

  try {
    await bot.restrictChatMember(msg.chat.id, targetId, {
      permissions: {
        can_send_messages: true,
        can_send_media_messages: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
      },
    });

    if (getDatabaseStatus() === 'connected') {
      await Chat.updateOne(
        { chatId: String(msg.chat.id) },
        { $pull: { activeMutes: { userId: String(targetId) } } }
      );
    }

    return bot.sendMessage(msg.chat.id, "Unmuted! Go ahead and speak~ 🍭 meowww");
  } catch (err) {
    console.error('[Unmute] Error unmuting user:', err.message);
    return bot.sendMessage(msg.chat.id, "Failed to unmute user. Make sure I have enough rights.");
  }
}

export async function handlePromoteCommand(bot, msg, args) {
  if (msg.chat.type === 'private') {
    return bot.sendMessage(msg.chat.id, "Promoting is only for groups!");
  }

  const permLevel = await getPermissionLevel(bot, msg.chat.id, msg.from.id);
  if (permLevel < 2) {
    return bot.sendMessage(msg.chat.id, "Hmp, you're not allowed to promote anyone! 😜");
  }

  const target = await resolveTargetUser(bot, msg, args);
  if (!target || (!target.user && !target.userId)) {
    return bot.sendMessage(msg.chat.id, "Reply to the message of the user you want me to promote!");
  }

  const targetId = target.user ? target.user.id : target.userId;

  try {
    await bot.promoteChatMember(msg.chat.id, targetId, {
      can_manage_chat: true,
      can_delete_messages: true,
      can_invite_users: true,
      can_restrict_members: true,
      can_pin_messages: true,
    });

    return bot.sendMessage(msg.chat.id, "Promoted to admin! Use your powers wisely~ 😏 meowww");
  } catch (err) {
    console.error('[Promote] Error:', err.message);
    return bot.sendMessage(msg.chat.id, "Couldn't promote this member! Check my bot permissions.");
  }
}

export async function handleMaxPromoteCommand(bot, msg, args) {
  if (msg.chat.type === 'private') {
    return bot.sendMessage(msg.chat.id, "Promoting is only for groups!");
  }

  const permLevel = await getPermissionLevel(bot, msg.chat.id, msg.from.id);
  if (permLevel < 2) {
    return bot.sendMessage(msg.chat.id, "Only group admins or my Darling can maxpromote! 😤");
  }

  const target = await resolveTargetUser(bot, msg, args);
  if (!target || (!target.user && !target.userId)) {
    return bot.sendMessage(msg.chat.id, "Reply to the user you want to grant maximum privileges to!");
  }

  const targetId = target.user ? target.user.id : target.userId;

  try {
    await bot.promoteChatMember(msg.chat.id, targetId, {
      can_manage_chat: true,
      can_change_info: true,
      can_delete_messages: true,
      can_invite_users: true,
      can_restrict_members: true,
      can_pin_messages: true,
      can_promote_members: true,
      can_manage_video_chats: true,
    });

    return bot.sendMessage(msg.chat.id, "Max promoted! You have full authority now~ 🔥 meowww");
  } catch (err) {
    console.error('[MaxPromote] Error:', err.message);
    return bot.sendMessage(msg.chat.id, "Failed to max promote. Telegram restricts what permissions I can grant.");
  }
}
