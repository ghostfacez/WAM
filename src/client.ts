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
    ],
  },

  authStrategy: new LocalAuth({
    dataPath: '/app/.wwebjs_auth',
  }),
});

client.on('qr', qr => {
  console.log('Scan this QR code with WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
  console.log(text[LANGUAGE].CONNECTED);
});

client.on('authenticated', () => {
  console.log('WhatsApp authenticated. Session saved.');
});

client.on('auth_failure', msg => {
  console.error('Authentication failed:', msg);
});

client.on('disconnected', reason => {
  console.log('WhatsApp disconnected:', reason);
});

export default client;
