import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';

import { DOWNLOAD_PATH } from '../../config';

const execAsync = promisify(exec);

export default class YTDownload {
  public async download(videoId: string): Promise<string> {
    if (!fs.existsSync(DOWNLOAD_PATH)) {
      fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
    }

    const proxyUrl = process.env.PROXY_URL;
    const proxyFlag = proxyUrl ? `--proxy "${proxyUrl}"` : '';

    // Use Piped API to get stream URL (Piped handles YouTube on their end)
    console.log('=== FETCHING STREAM INFO ===');
    const streamInfo = await new Promise<any>((resolve, reject) => {
      https.get(`https://pipedapi.kavin.rocks/streams/${videoId}`, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('Failed to parse stream info')); }
        });
      }).on('error', reject);
    });

    if (!streamInfo.audioStreams?.length) {
      throw new Error('No audio streams found');
    }

    // Pick best audio
    const audio = streamInfo.audioStreams
      .filter((s: any) => s.mimeType?.includes('audio'))
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    console.log('=== TITLE ===', streamInfo.title);
    console.log('=== AUDIO ===', audio.quality, audio.mimeType);

    // Download through your proxy using yt-dlp (just the download part)
    const rawOutput = path.join(DOWNLOAD_PATH, `${videoId}.webm`);
    const mp3Output = path.join(DOWNLOAD_PATH, `${videoId}.mp3`);

    console.log('=== DOWNLOADING VIA PROXY ===');
    await execAsync(
      `curl ${proxyFlag ? proxyFlag.replace('--proxy', '-x') : ''} -L -o "${rawOutput}" "${audio.url}"`,
      { maxBuffer: 1024 * 1024 * 10, timeout: 60000 }
    );

    if (!fs.existsSync(rawOutput)) {
      throw new Error('Download failed: audio file was not created');
    }

    // Convert to mp3
    console.log('=== CONVERTING TO MP3 ===');
    await execAsync(`ffmpeg -i "${rawOutput}" -vn -ab 192k "${mp3Output}" -y`, {
      timeout: 30000,
    });

    fs.unlinkSync(rawOutput);

    if (!fs.existsSync(mp3Output)) {
      throw new Error('Conversion failed: MP3 file was not created');
    }

    return mp3Output;
  }
}
