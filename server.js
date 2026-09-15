import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './src/config.js';
import { connectDatabase, getDatabaseStatus } from './src/database.js';
import { initializeBot, getBotStatus, getBot } from './src/bot.js';
import { generateZeroTwoResponse } from './src/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.port;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from public/ directory
const publicDirectory = path.join(__dirname, 'public');
app.use(express.static(publicDirectory));

/**
 * Render Health Check Endpoint
 * Returns HTTP 200 with service state
 */
app.get('/health', (req, res) => {
  const dbStatus = getDatabaseStatus();
  const botState = getBotStatus();

  const isHealthy = botState === 'online' || botState.startsWith('standby');

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    bot: botState,
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

/**
 * Web Simulator API Endpoint:
 * Allows testing Zero Two's AI personality and commands directly from the website preview!
 */
app.post('/api/chat-simulation', async (req, res) => {
  try {
    const { message, history = [], isDarling = false } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const trimmed = message.trim();

    // Command simulations in web test interface
    if (trimmed.startsWith('/ping')) {
      return res.json({
        reply: isDarling ? "Pong~ 💗 meowww" : "Pong~ ✨ I'm online and ready!",
        command: 'ping',
      });
    }

    if (trimmed.startsWith('/help')) {
      return res.json({
        reply: `🌸 Zero Two Commands\n\n/start — Start Zero Two\n/help — Show commands\n/about — About me\n/ping — Check status\n\nAdmin:\n/ban, /unban, /mute [time], /unmute, /promote, /maxpromote`,
        command: 'help',
      });
    }

    if (trimmed.startsWith('/about')) {
      return res.json({
        reply: `Zero Two is an intelligent AI assistant inspired by Darling in the FranXX, built with Node.js, Express, MongoDB, and NVIDIA AI. Creator: DEV (Telegram: @Meow9637)${isDarling ? ' meowww' : ''}`,
        command: 'about',
      });
    }

    if (trimmed.startsWith('/ban') || trimmed.startsWith('/mute') || trimmed.startsWith('/promote')) {
      return res.json({
        reply: isDarling
          ? `Executed for you, Darling~ 😏 meowww`
          : `Only group admins can use moderation commands in real groups! 😜`,
        command: 'admin',
      });
    }

    const reply = await generateZeroTwoResponse(trimmed, history, Boolean(isDarling));
    return res.json({ reply });
  } catch (err) {
    console.error('[WebSimulator] Error:', err.message);
    res.status(500).json({ error: 'Failed to process AI response' });
  }
});

/**
 * Webhook route for Telegram if webhook mode is enabled
 */
app.post('/webhook', (req, res) => {
  const bot = getBot();
  if (bot && typeof bot.processUpdate === 'function') {
    bot.processUpdate(req.body);
  }
  res.sendStatus(200);
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDirectory, 'index.html'));
});

// Start server and initialize subsystems
async function startApplication() {
  console.log('==============================================');
  console.log('🌸 Starting Zero Two Telegram AI Bot Service 🌸');
  console.log('==============================================');

  // 1. Connect to MongoDB Atlas
  await connectDatabase();

  // 2. Initialize Telegram Bot
  await initializeBot();

  // 3. Start Express HTTP Server
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Express] Web dashboard & health endpoint running on port ${PORT}`);
    console.log(`[Express] Health check URL: http://localhost:${PORT}/health`);
  });

  // Optional Self-Ping Keep-Alive for Render free tier sleep prevention
  const selfPingUrl = process.env.SELF_PING_URL;
  if (selfPingUrl) {
    console.log(`[KeepAlive] Configured self-ping to: ${selfPingUrl} (every 14 mins)`);
    setInterval(async () => {
      try {
        const response = await fetch(`${selfPingUrl}/health`);
        console.log(`[KeepAlive] Self-ping status: ${response.status}`);
      } catch (err) {
        console.warn(`[KeepAlive] Ping failed:`, err.message);
      }
    }, 14 * 60 * 1000); // 14 minutes
  }

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('\n[Process] Received termination signal. Shutting down gracefully...');
    server.close(() => {
      console.log('[Express] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startApplication().catch((err) => {
  console.error('[Fatal Startup Error]:', err);
});
