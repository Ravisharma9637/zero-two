import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TelegramBot = require('node-telegram-bot-api');

import { config, validateBotConfig } from './config.js';
import { registerCommands } from './commands.js';
import { handleTextMessage } from './handlers/text.js';
import { handleStickerMessage } from './handlers/sticker.js';
import { handleGifMessage } from './handlers/gif.js';
import { handleVoiceMessage } from './handlers/voice.js';
import { preloadPacks } from './stickers.js';

let botInstance = null;
let botStatus = 'offline';

export async function initializeBot() {
  const check = validateBotConfig();

  if (!check.valid) {
    console.warn(`[Bot] ${check.message}`);
    botStatus = 'standby (missing TELEGRAM_TOKEN or NVIDIA_API_KEY)';
    return null;
  }

  try {
    const isWebhook = Boolean(config.webhookUrl);

    // Initialize bot with either polling or webhook
    botInstance = new TelegramBot(config.telegramToken, {
      polling: !isWebhook,
    });

    botStatus = 'online';
    console.log(`[Bot] Telegram Bot initialized successfully (${isWebhook ? 'Webhook' : 'Polling'} mode).`);

    // Graceful error handling - never crash on polling or network drops
    botInstance.on('polling_error', (error) => {
      // Common transient errors (EFATAL, ETELEGRAM 409 conflict, timeout)
      if (error.code === 'EFATAL' || error.message.includes('ETELEGRAM')) {
        console.warn(`[Bot Polling Warning] ${error.message}`);
      } else {
        console.error('[Bot Polling Error]', error.message);
      }
    });

    botInstance.on('error', (error) => {
      console.error('[Bot General Error]', error.message);
    });

    // Register all slash commands
    registerCommands(botInstance);

    // Hook up message listeners
    botInstance.on('message', async (msg) => {
      try {
        if (!msg) return;

        if (msg.voice) {
          await handleVoiceMessage(botInstance, msg);
        } else if (msg.animation || (msg.document && msg.document.mime_type?.includes('gif'))) {
          await handleGifMessage(botInstance, msg);
        } else if (msg.sticker) {
          await handleStickerMessage(botInstance, msg);
        } else if (msg.text) {
          await handleTextMessage(botInstance, msg);
        }
      } catch (err) {
        console.error('[Bot Dispatcher Error]', err.message);
      }
    });

    // Preload sticker packs asynchronously
    preloadPacks(botInstance).catch((err) => {
      console.warn('[Stickers] Preload background task warning:', err.message);
    });

    // Fetch bot info
    botInstance.getMe().then((me) => {
      console.log(`[Bot] Active as @${me.username} (ID: ${me.id})`);
    }).catch(() => {});

    return botInstance;
  } catch (error) {
    botStatus = 'error';
    console.error('[Bot] Initialization failed:', error.message);
    return null;
  }
}

export function getBot() {
  return botInstance;
}

export function getBotStatus() {
  return botStatus;
}
