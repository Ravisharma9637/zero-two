import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Telegram Bot Token
  telegramToken: process.env.TELEGRAM_TOKEN || '',
  botUsername: process.env.BOT_USERNAME || 'zero_two_9637_bot',

  // MongoDB connection URI
  mongoUri: process.env.MONGODB_URI || '',

  // NVIDIA AI API credentials
  nvidiaApiKey: process.env.NVIDIA_API_KEY || '',
  nvidiaBaseUrl: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  nvidiaModel: process.env.NVIDIA_MODEL || 'openai/gpt-oss-20b',

  // Darling / Special User ID
  specialUserId: process.env.SPECIAL_USER_ID ? String(process.env.SPECIAL_USER_ID).trim() : '',

  // Server port (Hardcoded 3000 for local/container dev server, uses process.env.PORT when deployed on Render)
  port: (process.env.RENDER && process.env.PORT) ? parseInt(process.env.PORT, 10) : 3000,

  // Webhook or polling mode (polling by default, webhook if WEBHOOK_URL is set)
  webhookUrl: process.env.WEBHOOK_URL || '',

  // Memory Limit per user/conversation (10 MB in bytes)
  maxMemoryBytes: 10 * 1024 * 1024, // 10,485,760 bytes

  // Audio Speech-to-Text configuration (optional Whisper API key or NVIDIA STT)
  sttApiKey: process.env.STT_API_KEY || process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY || '',
  sttBaseUrl: process.env.STT_BASE_URL || 'https://api.openai.com/v1',
};

// Validates required environment variables for the Telegram bot
export function validateBotConfig() {
  const missing = [];
  if (!config.telegramToken) missing.push('TELEGRAM_TOKEN');
  if (!config.nvidiaApiKey) missing.push('NVIDIA_API_KEY');

  if (missing.length > 0) {
    return {
      valid: false,
      missing,
      message: `Missing required environment variables: ${missing.join(', ')}. Bot will run in standby mode until configured.`,
    };
  }

  return { valid: true, missing: [], message: 'Configuration valid' };
}
