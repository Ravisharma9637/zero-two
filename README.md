# 🌸 Zero Two AI — Production Telegram Bot & Web Service

> An intelligent, personality-driven Telegram AI assistant modeled after **Zero Two from *Darling in the FranXX***. Designed to run 24/7 on **Render** using **Node.js**, **Express**, **MongoDB Atlas**, and the **NVIDIA OpenAI-compatible API** (`openai/gpt-oss-20b`).

---

## 📑 Table of Contents
1. [What the Bot Does](#1-what-the-bot-does)
2. [Features](#2-features)
3. [Requirements](#3-requirements)
4. [Creating a Telegram Bot with BotFather](#4-creating-a-telegram-bot-with-botfather)
5. [Creating MongoDB Atlas Database](#5-creating-mongodb-atlas-database)
6. [Getting NVIDIA API Credentials](#6-getting-nvidia-api-credentials)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Local Installation](#8-local-installation)
9. [Running Locally](#9-running-locally)
10. [Render Deployment Guide](#10-render-deployment-guide)
11. [Adding Environment Variables in Render](#11-adding-environment-variables-in-render)
12. [Setting Bot Administrator Permissions](#12-setting-bot-administrator-permissions)
13. [Adding Website Images](#13-adding-website-images)
14. [Testing Commands](#14-testing-commands)
15. [Troubleshooting & FAQ](#15-troubleshooting--faq)

---

## 1. What the Bot Does

Zero Two AI connects to your Telegram account or groups as a full-featured conversational companion and community moderator:
- **For Her Darling (`SPECIAL_USER_ID`)**: Acts as a devoted, loving, teasing girlfriend who calls him "darling~", remembers their conversations, playfully gets jealous, checks if he ate or slept, and always ends messages with `"meowww"`.
- **For Normal Users**: Behaves with a lively, spirited, mischievous anime flair without treating them as her boyfriend.
- **For Groups**: Full administration tools (`/ban`, `/unban`, `/mute`, `/unmute`, `/promote`, `/maxpromote`), responds to mentions, replies, voice notes, stickers, and GIFs without spamming the chat.
- **For the Web**: Bundled with a responsive, dark-aesthetic landing page and live health endpoint (`/health`) served by Express on the same port.

---

## 2. Features

- ⚡ **NVIDIA OpenAI-Compatible Backend**: High-performance text generation via model `openai/gpt-oss-20b` (no leaked reasoning tokens).
- 🧠 **Smart MongoDB Memory**: Persistent conversation history stored per user and per chat (group chats do not leak into private conversations).
- 🛡️ **10 MB Memory Auto-Purge Guard**: If any conversation history exceeds 10 MB, the system automatically purges the stored messages and resets context cleanly to prevent document overflow.
- 🎭 **Real Telegram Sticker Packs**: Preloads 6 official Zero Two sticker packs (`Snowww41`, `Hiroxzerotwo02`, etc.) and matches reactions to 18 emotional moods (happy, love, angry, smug, hype).
- 🎬 **GIF Reaction Engine**: Detects incoming animations/GIFs and responds with an expressive Zero Two sticker.
- 🎙️ **Voice Message Pipeline**: Downloads `.oga` voice notes, performs Speech-to-Text transcription, and replies in character.
- 🛡️ **Three-Tier Permission Hierarchy**:
  - **Level 1 (Normal User)**: Cannot issue admin commands. Receives a Zero Two refusal.
  - **Level 2 (Group Admin)**: Standard group administration rights.
  - **Level 3 (Darling)**: Can execute moderation commands without needing Telegram admin rank.
- 🩺 **Keep-Alive & Health System**: `/health` endpoint and optional background self-ping to keep Render free tier awake.

---

## 3. Requirements

- **Node.js**: v18.x, v20.x, or v22.x LTS
- **MongoDB Atlas**: Free M0 Cluster or local MongoDB instance (v6+)
- **Telegram Bot Token**: Generated from Telegram's official `@BotFather`
- **NVIDIA API Key**: Free or paid key from [NVIDIA Build](https://build.nvidia.com/)
- **Render Account**: For cloud hosting (Web Service)

---

## 4. Creating a Telegram Bot with BotFather

1. Open Telegram and search for **[@BotFather](https://t.me/BotFather)**.
2. Click **Start** and send the command:
   ```text
   /newbot
   ```
3. Enter a display name for your bot (e.g. `Zero Two AI`).
4. Enter a unique username ending in `bot` (e.g. `zero_two_9637_bot`).
5. BotFather will provide your **API Token** formatted like:
   ```text
   1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
   ```
   *Save this token as `TELEGRAM_TOKEN`.*
6. Enable Group Privacy settings:
   - Send `/setprivacy` to BotFather.
   - Choose your bot.
   - Set to **Disable** if you want the bot to see all group messages, or keep **Enable** if you only want it to respond when mentioned or replied to.

---

## 5. Creating MongoDB Atlas Database

1. Sign up or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new **Free Shared Cluster (M0)**.
3. Under **Database Access**, create a user (e.g., `zerotwouser`) with read/write privileges.
4. Under **Network Access**, add `0.0.0.0/0` (Allow Access from Anywhere) so Render can connect.
5. Click **Connect** → **Drivers (Node.js)** and copy your connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/zerotwo?retryWrites=true&w=majority
   ```
   *Replace `<password>` with your database user password and save as `MONGODB_URI`.*

---

## 6. Getting NVIDIA API Credentials

1. Visit [NVIDIA API Catalog / Build](https://build.nvidia.com/).
2. Locate the model **`openai/gpt-oss-20b`** (or browse available LLM models).
3. Click **Get API Key** and generate a new key.
4. Save this key as `NVIDIA_API_KEY`.
5. The API endpoint defaults to:
   ```text
   https://integrate.api.nvidia.com/v1
   ```

---

## 7. Environment Variables Reference

Create a `.env` file in your root folder with the following keys:

| Variable | Required | Description | Example |
|---|---|---|---|
| `TELEGRAM_TOKEN` | **Yes** | Bot token from @BotFather | `7123456789:AAH...` |
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string | `mongodb+srv://...` |
| `NVIDIA_API_KEY` | **Yes** | API key from NVIDIA Build portal | `nvapi-...` |
| `SPECIAL_USER_ID` | **Yes** | Numerical Telegram ID of Darling | `123456789` |
| `BOT_USERNAME` | Optional | Bot's Telegram handle (without @) | `zero_two_9637_bot` |
| `PORT` | Optional | Server port (Render sets this automatically) | `10000` |
| `SELF_PING_URL` | Optional | URL to ping every 14m on Render | `https://zero-two.onrender.com` |
| `STT_API_KEY` | Optional | Speech-to-text API key for voice notes | `sk-...` |

> 💡 **Tip to find your `SPECIAL_USER_ID`:**
> Message Telegram's official **`@userinfobot`** or **`@raw_data_bot`**. It will reply with your numerical `Id` (e.g., `987654321`).

---

## 8. Local Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Ravisharma9637/zero-two-bot.git
cd zero-two-bot
npm install
```

---

## 9. Running Locally

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in your credentials in `.env`.
3. Start the application:
   ```bash
   npm start
   ```
4. Open your browser to `http://localhost:3000` (or your configured `PORT`) to view the Zero Two AI dashboard and interactive chat simulator.

---

## 10. Render Deployment Guide

### Option A: Using Blueprint (`render.yaml`)
1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** → **Blueprint**.
3. Select your repository. Render will detect `render.yaml` and configure the Web Service automatically.
4. Fill in the prompted environment variables (`TELEGRAM_TOKEN`, `MONGODB_URI`, `NVIDIA_API_KEY`, `SPECIAL_USER_ID`).
5. Click **Apply**.

### Option B: Manual Web Service
1. Click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the build parameters:
   - **Name**: `zero-two-bot`
   - **Language**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
4. Under **Health Check Path**, enter:
   ```text
   /health
   ```
5. Click **Create Web Service**.

---

## 11. Adding Environment Variables in Render

1. Go to your Web Service dashboard on Render.
2. In the left menu, click **Environment**.
3. Click **Add Environment Variable** for each of:
   - `TELEGRAM_TOKEN`
   - `MONGODB_URI`
   - `NVIDIA_API_KEY`
   - `SPECIAL_USER_ID`
   - `BOT_USERNAME`
   - `SELF_PING_URL` (set to `https://your-service-name.onrender.com`)
4. Click **Save Changes**. Render will automatically trigger a zero-downtime redeploy.

---

## 12. Setting Bot Administrator Permissions

To use moderation commands (`/ban`, `/unban`, `/mute`, `/promote`):
1. Add Zero Two to your Telegram group.
2. Open **Group Settings** → **Administrators** → **Add Admin**.
3. Select Zero Two and grant these rights:
   - ✅ Delete Messages
   - ✅ Ban/Restrict Users
   - ✅ Invite Users via Link
   - ✅ Pin Messages
   - ✅ Promote Members (optional, needed for `/promote` and `/maxpromote`)

---

## 13. Adding Website Images

The web dashboard is configured to use assets located in `public/images/`:
- `public/images/zerotwo.png` — Hero character portrait (400x400 transparent PNG or SVG).
- `public/images/background.jpg` — Ambient dark background wallpaper.

*If custom image files are not provided, the application automatically uses the bundled high-resolution SVG fallback (`public/images/zerotwo.svg`).*

---

## 14. Testing Commands

Once your bot is running, test these commands in private chat or your group:

| Command | Action | Example Output |
|---|---|---|
| `/start` | Welcome message | *"Darling! You came to find me~ 💗 meowww"* |
| `/ping` | Latency health check | *"Pong~ 💗 meowww"* |
| `/help` | Complete command guide | Displays command markdown guide |
| `/about` | Creator & bot metadata | Shows DEV info & links |
| `/mute 10m` | *(Reply to user)* Mute for 10 minutes | *"Muted for 10m~ 🤫 Enjoy the silence! meowww"* |
| `/unmute` | *(Reply to user)* Restore voice | *"Unmuted! Go ahead and speak~ 🍭 meowww"* |
| `/ban` | *(Reply to user)* Ban member | *"Banned~ 😏 Maybe they'll behave next time. meowww"* |
| `/unban` | Unban member by reply/ID | *"Unbanned! Tell them not to mess up again~ ✨"* |
| `/promote` | Promote to standard admin | *"Promoted to admin! Use your powers wisely~ 😏 meowww"* |
| `/maxpromote` | Max administrative rights | *"Max promoted! You have full authority now~ 🔥 meowww"* |

---

## 15. Troubleshooting & FAQ

### Q: The bot says "Polling Error 409 Conflict"
**A:** This means another instance of the bot is running with the same `TELEGRAM_TOKEN`. Ensure only one dev server or Render service is active.

### Q: The bot does not respond in group chats
**A:**
1. Check if the bot was mentioned (`@your_bot_username`), replied to, or if the message includes `"zero two"`.
2. Disable Group Privacy in `@BotFather` using `/setprivacy` if you want the bot to see every message.

### Q: Voice message replies say "I couldn't quite hear that"
**A:** Ensure your voice message is clear, or set `STT_API_KEY` in your environment variables to enable Whisper audio transcription.

### Q: Database shows "unconfigured" on `/health`
**A:** Check that `MONGODB_URI` is correctly populated and that your IP whitelist in MongoDB Atlas includes `0.0.0.0/0`.

---

## 👨‍💻 Developer & Credits

- **Developer**: DEV ([Telegram: @Meow9637](https://t.me/Meow9637))
- **GitHub Repository**: [Ravisharma9637/zero-two-bot](https://github.com/Ravisharma9637/zero-two-bot)
- **Owner GitHub**: [Ravisharma9637](https://github.com/Ravisharma9637/)
- **Live Telegram Bot**: [@zero_two_9637_bot](https://t.me/zero_two_9637_bot)

*Crafted with 💗 for Darling.*
