import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { Socket } from 'socket.io';
import { toBuffer } from 'qrcode';
import fetch from 'node-fetch';

function connect(conn, PORT) {
  const app = global.app = express();
  console.log(app);
  const server = global.server = createServer(app);
  let _qr = 'The QR code is invalid, it may have already been scanned.';

  conn.ev.on('connection.update', function appQR({ qr }) {
    if (qr) _qr = qr;
  });

  app.use(async (req, res) => {
    res.setHeader('Content-Type', 'image/png');
    res.end(await toBuffer(_qr));
  });

  server.listen(PORT, () => {
    console.log(`[ ℹ️ ] The application is listening on port ${PORT} (ignore if the QR code has already been scanned)`);
    if (opts['keepalive']) keepAlive();
  });
}

function pipeEmit(event, event2, prefix = '') {
  const originalEmit = event.emit;
  event.emit = function (event, ...args) {
    originalEmit.call(event, event, ...args);
    event2.emit(prefix + event, ...args);
  };
  return {
    unpipeEmit() {
      event.emit = originalEmit;
    }
  };
}

function keepAlive() {
  const url = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  if (/(\/\/|\.)undefined\./.test(url)) return;
  setInterval(() => {
    fetch(url).catch(console.error);
  }, 5 * 60 * 1000); // Check every 5 minutes
}

export default connect;
