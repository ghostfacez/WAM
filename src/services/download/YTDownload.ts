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
    const proxyFlag = proxyUrl ? `--proxy ${proxyUrl}` : '';

    // 1. LIST FORMATS FIRST - this will show in Railway logs
    console.log('=== LISTING FORMATS ===');
    try {
      const { stdout } = await execAsync(
        `yt-dlp ${proxyFlag} --extractor-args "youtube:player_client=tv" -F "${url}"`,
        { maxBuffer: 1024 * 1024 * 10 }
      );
      console.log(stdout);
    } catch (e: any) {
      console.error('Could not list formats:', e.stderr);
    }

    // 2. TRY TO DOWNLOAD - pick any audio
    const cmd = `yt-dlp \
      ${proxyFlag} \
      -f "bestaudio[ext=m4a]/bestaudio/best" \
      --extract-audio \
      --audio-format mp3 \
      --audio-quality 0 \
      --no-playlist \
      --no-warnings \
      --no-check-certificate \
      --socket-timeout 30 \
      --retries 5 \
      --extractor-args "youtube:player_client=tv;youtube:player_skip=webpage" \
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
