const fs = require('fs');
const dotenv = require('dotenv');
const path = './config.env';

if (fs.existsSync(path)) dotenv.config({ path });

function convertToBool(text, fault = 'true') {
    return text.toLowerCase() === fault.toLowerCase();
}

module.exports = {
    SESSION_ID: process.env.SESSION_ID || "",
    MONGODB: process.env.MONGODB || "",
    PORT: process.env.PORT || 8000,
    PREFIX: process.env.PREFIX || ".",
    OWNER_NUMBER: process.env.OWNER_NUMBER || "254732647560",
    AUTO_READ_STATUS: convertToBool(process.env.AUTO_READ_STATUS || "true"),
};
