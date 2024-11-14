const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, jidNormalizedUser, getContentType, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const l = console.log;
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
const fs = require('fs');
const P = require('pino');
const config = require('./config');
const qrcode = require('qrcode-terminal');
const util = require('util');
const { sms, downloadMediaMessage } = require('./lib/msg');
const axios = require('axios');
const { File } = require('megajs');
const express = require("express");

const ownerNumber = ['254732647560'];
const app = express();
const port = process.env.PORT || 8000;

// Download session file if it doesn't exist
if (!fs.existsSync(__dirname + '/nyxx_md_licence/creds.json')) {
    if (!config.SESSION_ID) return console.log('Please add your session to SESSION_ID env !!');
    const sessdata = config.SESSION_ID;
    const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
    filer.download((err, data) => {
        if (err) throw err;
        fs.writeFile(__dirname + '/nyxx_md_licence/creds.json', data, () => {
            console.log("Session downloaded ✅");
        });
    });
}

// Function to connect to WhatsApp
async function connectToWA() {
    const connectDB = require('./lib/mongodb');
    connectDB();
    const { readEnv } = require('./lib/database');
    const config = await readEnv();
    const prefix = config.PREFIX;
    console.log("Connecting wa bot 🧬...");

    const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/nyxx_md_licence/');
    var { version } = await fetchLatestBaileysVersion();
    const conn = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS("Firefox"),
        syncFullHistory: true,
        auth: state,
        version
    });

    // Connection update events
    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if (lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
                connectToWA();
            }
        } else if (connection === 'open') {
            console.log('😼 Installing... ');
            installPlugins(conn);
            console.log('Bot connected to WhatsApp ✅');
            let up = `𝗛𝗲𝘆 \n𝗜 𝗮𝗺\n𝗢𝗻𝗹𝗶𝗻𝗲 𝗡𝗼𝘄 🤡`;
            conn.sendMessage(ownerNumber + "@s.whatsapp.net", { image: { url: `https://files.catbox.moe/y1hq7c.jpg` }, caption: up });
        }
    });

    conn.ev.on('creds.update', saveCreds);

    // Message upsert event
    conn.ev.on('messages.upsert', async (mek) => {
        mek = mek.messages[0];
        if (!mek.message) return;
        mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;

        if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_READ_STATUS === "true") {
            await conn.readMessages([mek.key]);
        }

        handleIncomingMessage(conn, mek);
    });
}

// Install plugins
function installPlugins(conn) {
    const path = require('path');
    fs.readdirSync("./plugins/").forEach((plugin) => {
        if (path.extname(plugin).toLowerCase() === ".js") {
            require("./plugins/" + plugin);
        }
    });
    console.log('Plugins installed successful ✅');
}

// Handle incoming messages
async function handleIncomingMessage(conn, mek) {
    const m = sms(conn, mek);
    const type = getContentType(mek.message);
    const body = getMessageBody(type, mek);

    const from = mek.key.remoteJid;
    const isCmd = body.startsWith(config.PREFIX);
    const command = isCmd ? body.slice(config.PREFIX.length).trim().split(' ').shift().toLowerCase() : '';
    const args = body.trim().split(/ +/).slice(1);
    const q = args.join(' ');

    const sender = mek.key.fromMe ? (conn.user.id.split(':')[0] + '@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid);
    const senderNumber = sender.split('@')[0];
    const botNumber = conn.user.id.split(':')[0];
    const isOwner = ownerNumber.includes(senderNumber) || botNumber.includes(senderNumber);

    if (shouldIgnoreMessage(senderNumber, config)) return;

    const events = require('./command');
    if (isCmd) {
        const cmd = findCommand(events.commands, command);
        if (cmd) executeCommand(cmd, conn, mek, m, { from, body, command, args, q, sender, senderNumber });
    }

    processEvents(events.commands, conn, mek, m, { from, body, isCmd, command, args, q, sender, senderNumber });
}

// Extract message body
function getMessageBody(type, mek) {
    return (type === 'conversation') ? mek.message.conversation :
           (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text :
           (type == 'imageMessage' && mek.message.imageMessage.caption) ? mek.message.imageMessage.caption :
           (type == 'videoMessage' && mek.message.videoMessage.caption) ? mek.message.videoMessage.caption :
           '';
}

// Check if the message should be ignored
function shouldIgnoreMessage(senderNumber, config) {
    return (!isOwner && config.MODE === "private") || (!isOwner && isGroup && config.MODE === "inbox") || (!isOwner && !isGroup && config.MODE === "groups");
}

// Find command
function findCommand(commands, commandName) {
    return commands.find((cmd) => cmd.pattern === commandName) || commands.find((cmd) => cmd.alias && cmd.alias.includes(commandName));
}

// Execute command
function executeCommand(cmd, conn, mek, m, context) {
    if (cmd.react) conn.sendMessage(context.from, { react: { text: cmd.react, key: mek.key } });
    try {
        cmd.function(conn, mek, m, context);
    } catch (e) {
        console.error("[PLUGIN ERROR] " + e);
    }
}

// Process events
function processEvents(commands, conn, mek, m, context) {
    commands.forEach(async (command) => {
        if (context.body && command.on === "body") {
            command.function(conn, mek, m, context);
        } else if (mek.q && command.on === "text") {
            command.function(conn, mek, m, context);
        } else if ((command.on === "image" || command.on === "photo") && mek.type === "imageMessage") {
            command.function(conn, mek, m, context);
        } else if (command.on === "sticker" && mek.type === "stickerMessage") {
            command.function(conn, mek, m, context);
        }
    });
}

// Express server setup
app.get("/", (req, res) => {
    res.send("Hey, bot started✅");
});
app.listen(port, () => console.log(`Server listening on port http://localhost:${port}`));
setTimeout(() => { connectToWA(); }, 4000);
