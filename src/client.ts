import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

import text from './language';
import { LANGUAGE } from './config';

const client = new Client({
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  },

  authStrategy: new LocalAuth({
    dataPath: '/app/.wwebjs_auth',
  }),

  restartOnAuthFail: true,
});

client.on('qr', qr => {
  console.log('Scan QR code:');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('WhatsApp session saved.');
});

client.on('ready', async () => {
  console.log(text[LANGUAGE].CONNECTED);
});

client.on('auth_failure', error => {
  console.error('WhatsApp authentication failed:', error);
});

client.on('disconnected', reason => {
  console.log('WhatsApp disconnected:', reason);
});

export default client;
