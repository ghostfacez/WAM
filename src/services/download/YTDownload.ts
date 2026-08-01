import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

import { DOWNLOAD_PATH } from '../../config';

const execAsync = promisify(exec);

export default class YTDownload {
  public async download(videoId: string): Promise<string> {
    const output = `${DOWNLOAD_PATH}/${videoId}.mp3`;
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    await execAsync(
      `yt-dlp \
      --extract-audio \
      --audio-format mp3 \
      --audio-quality 0 \
      --no-playlist \
      --extractor-args "youtube:player_client=web" \
      -o "${output}" \
      "${url}"`,
    );

    if (!fs.existsSync(output)) {
      throw new Error('Download failed: MP3 file was not created');
    }

    return output;
  }
}
