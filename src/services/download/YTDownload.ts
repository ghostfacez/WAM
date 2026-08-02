import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

import { DOWNLOAD_PATH } from '../../config';

const execAsync = promisify(exec);

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yt.cdaut.de',
  'https://invidious.privacyredirect.com',
];

export default class YTDownload {
  public async download(videoId: string): Promise<string> {
    if (!fs.existsSync(DOWNLOAD_PATH)) {
      fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
    }

    const proxyUrl = process.env.PROXY_URL;
    const curlProxy = proxyUrl ? `-x "${proxyUrl}"` : '';

    let streamInfo: any = null;
    let workingInstance: string = '';

    for (const instance of INVIDIOUS_INSTANCES) {
      console.log(`=== TRYING ${instance} ===`);
      try {
        const { stdout } = await execAsync(
          `curl ${curlProxy} -s "${instance}/api/v1/videos/${videoId}"`,
          { maxBuffer: 1024 * 1024 * 10, timeout: 15000 }
        );
        streamInfo = JSON.parse(stdout);
        workingInstance = instance;
        console.log('=== TITLE ===', streamInfo.title);
        break;
      } catch (e: any) {
        console.log(`Failed: ${e.message}`);
      }
    }

    if (!streamInfo) {
      throw new Error('All Invidious instances failed');
    }

    const audioFormats = (streamInfo.adaptiveFormats || [])
      .filter((f: any) => f.type?.startsWith('audio/'))
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

    if (!audioFormats.length) {
      throw new Error('No audio formats found');
    }

    const bestAudio = audioFormats[0];
    console.log('=== AUDIO ===', bestAudio.type, Math.round(bestAudio.bitrate / 1000) + 'kbps');

    const rawOutput = path.join(DOWNLOAD_PATH, `${videoId}.webm`);
    const mp3Output = path.join(DOWNLOAD_PATH, `${videoId}.mp3`);

    // local=true makes Invidious proxy the download through their server
    const downloadUrl = `${workingInstance}/latest_version?id=${videoId}&itag=${bestAudio.itag}&local=true`;

    console.log('=== DOWNLOADING ===');
    await execAsync(
      `curl ${curlProxy} -L -o "${rawOutput}" "${downloadUrl}"`,
      { maxBuffer: 1024 * 1024 * 10, timeout: 120000 }
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
