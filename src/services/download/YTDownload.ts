import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

import { DOWNLOAD_PATH } from '../../config';

const execAsync = promisify(exec);

export default class YTDownload {
  public async download(videoId: string): Promise<string> {
    const output = `${DOWNLOAD_PATH}/${videoId}.mp3`;
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    // Build proxy flag only if credentials are provided
    const proxyUrl = process.env.PROXY_URL;
    const proxyFlag = proxyUrl ? `--proxy "${proxyUrl}"` : '';

    // Optional: use cookies if you still want to export them later
    const cookiesFlag = process.env.YT_COOKIES_PATH
      ? `--cookies "${process.env.YT_COOKIES_PATH}"`
      : '';

    await execAsync(
      `yt-dlp \
      --extract-audio \
      --audio-format mp3 \
      --audio-quality 0 \
      --no-playlist \
      --no-warnings \
      ${proxyFlag} \
      ${cookiesFlag} \
      -o "${output}" \
      "${url}"`,
    );

    if (!fs.existsSync(output)) {
      throw new Error('Download failed: MP3 file was not created');
    }

    return output;
  }
}
