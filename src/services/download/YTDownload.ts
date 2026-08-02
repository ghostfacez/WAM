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

    // Try multiple Piped instances
    const pipedInstances = [
      'https://pipedapi.kavin.rocks',
      'https://pipedapi.adminforge.de',
      'https://api.piped.projectsegfau.lt',
    ];

    let streamInfo: any = null;

    for (const instance of pipedInstances) {
      console.log(`=== TRYING ${instance} ===`);
      try {
        streamInfo = await new Promise<any>((resolve, reject) => {
          https.get(`${instance}/streams/${videoId}`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              console.log('Response status:', res.statusCode);
              console.log('Response preview:', data.substring(0, 200));
              try { resolve(JSON.parse(data)); }
              catch (e) { reject(new Error(`Not JSON: ${data.substring(0, 100)}`)); }
            });
          }).on('error', reject);
        });
        break;
      } catch (e: any) {
        console.log(`Failed: ${e.message}`);
      }
    }

    if (!streamInfo) {
      throw new Error('All Piped instances failed');
    }

    if (!streamInfo.audioStreams?.length) {
      throw new Error('No audio streams found');
    }

    const audio = streamInfo.audioStreams
      .filter((s: any) => s.mimeType?.includes('audio'))
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    console.log('=== TITLE ===', streamInfo.title);
    console.log('=== AUDIO ===', audio.quality, audio.mimeType);

    const rawOutput = path.join(DOWNLOAD_PATH, `${videoId}.webm`);
    const mp3Output = path.join(DOWNLOAD_PATH, `${videoId}.mp3`);

    console.log('=== DOWNLOADING VIA PROXY ===');
    const curlProxy = proxyUrl ? `-x "${proxyUrl}"` : '';
    await execAsync(
      `curl ${curlProxy} -L -o "${rawOutput}" "${audio.url}"`,
      { maxBuffer: 1024 * 1024 * 10, timeout: 60000 }
    );

    if (!fs.existsSync(rawOutput)) {
      throw new Error('Download failed: audio file was not created');
    }

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
