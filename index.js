import { join, dirname } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { setupMaster, fork } from 'cluster';
import cfonts from 'cfonts';
import readline from 'readline';
import yargs from 'yargs';
import chalk from 'chalk'; 
import fs from 'fs'; 
import './config.js';

const { PHONENUMBER_MCC } = await import('baileys');
const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(__dirname);
const { say } = cfonts;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let isRunning = false;

const question = (text) => new Promise((resolve) => rl.question(text, resolve));

console.log(chalk.yellow.bold('—◉ Starting system...'));

function verifyOrCreateAuthFolder() {
  const authPath = join(__dirname, global.authFile);
  if (!fs.existsSync(authPath)) {
    fs.mkdirSync(authPath, { recursive: true });
  }
}

function verifyCredsJson() {
  const credsPath = join(__dirname, global.authFile, 'creds.json');
  return fs.existsSync(credsPath);
}

function formatPhoneNumber(number) {
  let formattedNumber = number.replace(/[^\d+]/g, '');
  if (formattedNumber.startsWith('+254') && !formattedNumber.startsWith('+254')) {
    formattedNumber = formattedNumber.replace('+254', '+254');
  } else if (formattedNumber.startsWith('254') && !formattedNumber.startsWith('254')) {
    formattedNumber = `+521${formattedNumber.slice(2)}`;
  } else if (formattedNumber.startsWith('254') && formattedNumber.length >= 10) {
    formattedNumber = `+${formattedNumber}`;
  } else if (!formattedNumber.startsWith('+')) {
    formattedNumber = `+${formattedNumber}`;
  }
  return formattedNumber;
}

function isValidNumber(phoneNumber) {
  const numberWithoutPlus = phoneNumber.replace('+', '');
  return Object.keys(PHONENUMBER_MCC).some(code => numberWithoutPlus.startsWith(code));
}

async function start(file) {
  if (isRunning) return;
  isRunning = true;

  say('The Nyxx\nBot', {
    font: 'chrome',
    align: 'center',
    gradient: ['red', 'magenta'],
  });

  say(`Bot created by Mariana`, {
    font: 'console',
    align: 'center',
    gradient: ['red', 'magenta'],
  });

  verifyOrCreateAuthFolder();

  if (verifyCredsJson()) {
    const args = [join(__dirname, file), ...process.argv.slice(2)];
    setupMaster({ exec: args[0], args: args.slice(1) });
    const p = fork();
    return;
  }

  const option = await question(chalk.yellowBright.bold('—◉ Select an option (just the number):\n') + chalk.white.bold('1. With QR code\n2. With 8-digit text code\n—> '));

  let phoneNumber = '';
  if (option === '2') {
    const inputNumber = await question(chalk.yellowBright.bold('\n—◉ Write your WhatsApp number:\n') + chalk.white.bold('◉ Example: +5219992095479\n—> '));
    phoneNumber = formatPhoneNumber(inputNumber);
    if (!isValidNumber(phoneNumber)) {
      console.log(chalk.bgRed(chalk.white.bold('[ ERROR ] Invalid number. Ensure you entered your number in international format and started with the country code.\n—◉ Example:\n◉ +254732647560\n')));
      process.exit(0);
    }
    process.argv.push(phoneNumber);
  }

  if (option === '1') {
    process.argv.push('qr');
  } else if (option === '2') {
    process.argv.push('code');
  }

  const args = [join(__dirname, file), ...process.argv.slice(2)];
  setupMaster({ exec: args[0], args: args.slice(1) });

  const p = fork();

  p.on('message', (data) => {
    console.log(chalk.green.bold('—◉ RECEIVED:'), data);
    switch (data) {
      case 'reset':
        p.process.kill();
        isRunning = false;
        start.apply(this, arguments);
        break;
      case 'uptime':
        p.send(process.uptime());
        break;
    }
  });

  p.on('exit', (_, code) => {
    isRunning = false;
    console.error(chalk.red.bold('[ ERROR ] An unexpected error occurred:'), code);
    p.process.kill();
    isRunning = false;
    start.apply(this, arguments);
    if (process.env.pm_id) {
      process.exit(1);
    } else {
      process.exit();
    }
  });

  const opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
  if (!opts['test']) {
    if (!rl.listenerCount()) {
      rl.on('line', (line) => {
        p.emit('message', line.trim());
      });
    }
  }
}

start('main.js');
