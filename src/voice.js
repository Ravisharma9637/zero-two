import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import FormData from 'form-data';
import { config } from './config.js';

/**
 * Downloads a voice file from Telegram and transcribes it via an OpenAI-compatible Whisper endpoint
 */
export async function transcribeVoiceMessage(bot, fileId) {
  if (!bot || !fileId) return null;

  let tempFilePath = null;

  try {
    // 1. Get file link from Telegram
    const fileLink = await bot.getFileLink(fileId);
    if (!fileLink) {
      throw new Error('Unable to retrieve Telegram file link');
    }

    // 2. Download audio stream to temporary directory
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `voice_${Date.now()}_${fileId.slice(-6)}.oga`);

    const response = await axios({
      method: 'GET',
      url: fileLink,
      responseType: 'stream',
      timeout: 15000,
    });

    const writer = fs.createWriteStream(tempFilePath);
    await new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 3. Transcribe using Speech-to-Text API
    // Check if an STT API key or OpenAI key is present
    const apiKey = config.sttApiKey;
    if (!apiKey) {
      console.warn('[Voice] No STT API key configured (STT_API_KEY / OPENAI_API_KEY).');
      return null;
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(tempFilePath));
    form.append('model', 'whisper-1');

    const transcriptionUrl = `${config.sttBaseUrl.replace(/\/$/, '')}/audio/transcriptions`;
    const transRes = await axios.post(transcriptionUrl, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 25000,
    });

    if (transRes.data && transRes.data.text) {
      return transRes.data.text.trim();
    }

    return null;
  } catch (err) {
    console.error('[Voice] Transcription pipeline error:', err.message);
    return null;
  } finally {
    // 4. Always clean up temporary audio files safely
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanErr) {
        console.warn('[Voice] Failed to delete temp audio file:', cleanErr.message);
      }
    }
  }
}
