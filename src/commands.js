import {
  handleStartCommand,
  handleHelpCommand,
  handleAboutCommand,
  handlePingCommand,
  handleBanCommand,
  handleUnbanCommand,
  handleMuteCommand,
  handleUnmuteCommand,
  handlePromoteCommand,
  handleMaxPromoteCommand,
} from './handlers/commands.js';

/**
 * Registers all bot commands on startup
 */
export function registerCommands(bot) {
  if (!bot) return;

  // Basic Commands
  bot.onText(/^\/start(?:\s+(.*))?$/i, (msg) => handleStartCommand(bot, msg));
  bot.onText(/^\/help(?:\s+(.*))?$/i, (msg) => handleHelpCommand(bot, msg));
  bot.onText(/^\/about(?:\s+(.*))?$/i, (msg) => handleAboutCommand(bot, msg));
  bot.onText(/^\/ping(?:\s+(.*))?$/i, (msg) => handlePingCommand(bot, msg));

  // Admin Commands
  bot.onText(/^\/ban(?:\s+(.*))?$/i, (msg, match) => handleBanCommand(bot, msg, match[1]));
  bot.onText(/^\/unban(?:\s+(.*))?$/i, (msg, match) => handleUnbanCommand(bot, msg, match[1]));
  bot.onText(/^\/mute(?:\s+(.*))?$/i, (msg, match) => handleMuteCommand(bot, msg, match[1]));
  bot.onText(/^\/unmute(?:\s+(.*))?$/i, (msg, match) => handleUnmuteCommand(bot, msg, match[1]));
  bot.onText(/^\/promote(?:\s+(.*))?$/i, (msg, match) => handlePromoteCommand(bot, msg, match[1]));
  bot.onText(/^\/maxpromote(?:\s+(.*))?$/i, (msg, match) => handleMaxPromoteCommand(bot, msg, match[1]));

  // Set Telegram's native command list for user convenience
  try {
    bot.setMyCommands([
      { command: 'start', description: 'Start Zero Two' },
      { command: 'help', description: 'Show command guide' },
      { command: 'about', description: 'About Zero Two & creator' },
      { command: 'ping', description: 'Check bot latency & status' },
      { command: 'ban', description: 'Ban member (Admin/Darling)' },
      { command: 'unban', description: 'Unban member (Admin/Darling)' },
      { command: 'mute', description: 'Mute member [time] (Admin/Darling)' },
      { command: 'unmute', description: 'Unmute member (Admin/Darling)' },
      { command: 'promote', description: 'Promote to admin' },
      { command: 'maxpromote', description: 'Promote with max permissions' },
    ]).catch((err) => {
      console.warn('[Bot] Failed to set command menu:', err.message);
    });
  } catch (err) {
    console.warn('[Bot] setMyCommands error:', err.message);
  }
}
