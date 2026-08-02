import fs from 'fs';
import path from 'path';
import ytdl from '@distube/ytdl-core';
import { exec } from 'child_process';
import { promisify } from 'util';

import { DOWNLOAD_PATH } from '../../config';

const execAsync = promisify(exec);

export default class YTDownload {
  public async download(videoId: string): Promise<string> {
    if (!fs.existsSync(DOWNLOAD_PATH)) {
      fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const proxyUrl = process.env.PROXY_URL;
    const agent = proxyUrl ? ytdl.createProxyAgent(proxyUrl) : undefined;

    console.log('=== DOWNLOADING ===', proxyUrl ? 'via proxy' : 'no proxy');

    const info = await ytdl.getInfo(url, { agent });
    console.log('=== TITLE ===', info.videoDetails.title);
    console.log('=== FORMATS ===', info.formats.length, 'available');

    const stream = ytdl(url, {
      filter: 'audioonly',
      quality: 'highestaudio',
      agent,
    });

    const rawOutput = path.join(DOWNLOAD_PATH, `${videoId}.webm`);
    const mp3Output = path.join(DOWNLOAD_PATH, `${videoId}.mp3`);

    const writer = fs.createWriteStream(rawOutput);
    stream.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
      stream.on('error', reject);
    });

    // Convert to mp3 with ffmpeg
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
