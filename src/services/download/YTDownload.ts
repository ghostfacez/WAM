import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

import { DOWNLOAD_PATH } from '../../config';

const execAsync = promisify(exec);

export default class YTDownload {
  public async download(videoId: string): Promise<string> {
    if (!fs.existsSync(DOWNLOAD_PATH)) {
      fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
    }

    const output = path.join(DOWNLOAD_PATH, `${videoId}.mp3`);
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    const proxyUrl = process.env.PROXY_URL;
    const proxyFlag = proxyUrl ? `--proxy "${proxyUrl}"` : '';

    console.log('=== PROXY URL ===', proxyUrl || 'NOT SET');

    // LIST FORMATS
    console.log('=== LISTING FORMATS ===');
    try {
      const { stdout } = await execAsync(
        `yt-dlp ${proxyFlag} -F "${url}"`,
        { maxBuffer: 1024 * 1024 * 10 }
      );
      console.log(stdout);
    } catch (e: any) {
      console.error('List error:', e.stderr || e.message);
    }

    // DOWNLOAD
    const cmd = `yt-dlp \
      ${proxyFlag} \
      -f "bestaudio/best" \
      --extract-audio \
      --audio-format mp3 \
      --audio-quality 0 \
      --no-playlist \
      --no-warnings \
      --no-check-certificate \
      --socket-timeout 30 \
      --retries 5 \
      -o "${output}" \
      "${url}"`;

    try {
      console.log('=== DOWNLOADING ===');
      await execAsync(cmd, { maxBuffer: 1024 * 1024 * 10 });
    } catch (error: any) {
      console.error('yt-dlp error:', error.stderr || error.message);
      throw new Error(`Download failed: ${error.stderr || error.message}`);
    }

    if (!fs.existsSync(output)) {
      throw new Error('Download failed: MP3 file was not created');
    }

    return output;
  }
}
