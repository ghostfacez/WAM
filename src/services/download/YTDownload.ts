import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

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

    // Check version
    console.log('=== YT-DLP VERSION ===');
    try {
      const { stdout } = await execAsync('yt-dlp --version');
      console.log(stdout.trim());
    } catch (e) {
      console.log('Could not get version');
    }

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
