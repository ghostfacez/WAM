import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

import { DOWNLOAD_PATH } from '../../config';

const execAsync = promisify(exec);

export default class YTDownload {
  public async download(videoId: string): Promise<string> {
    // Make sure download folder exists
    if (!fs.existsSync(DOWNLOAD_PATH)) {
      fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
    }

    const output = path.join(DOWNLOAD_PATH, `${videoId}.mp3`);
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    const proxyUrl = process.env.PROXY_URL;
    const proxyFlag = proxyUrl ? `--proxy ${proxyUrl}` : '';

    try {
      await execAsync(
        `yt-dlp \
        -f "bestaudio[ext=m4a]/bestaudio/best" \
        --extract-audio \
        --audio-format mp3 \
        --audio-quality 0 \
        --no-playlist \
        --no-warnings \
        --no-check-certificate \
        --socket-timeout 30 \
        --retries 3 \
        --extractor-args "youtube:player_client=android" \
        --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
        ${proxyFlag} \
        -o "${output}" \
        "${url}"`,
        { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer for logs
      );
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
