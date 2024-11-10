import fs from 'fs';
import path, { dirname } from 'path';
import assert from 'assert';
import { spawn } from 'child_process';
import syntaxError from 'syntax-error';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(__dirname);
const packageJson = require(path.join(__dirname, './package.json'));

const folders = ['.', ...Object.keys(packageJson.directories)];
const files = [];

folders.forEach((folder) => {
  fs.readdirSync(folder)
    .filter((file) => file.endsWith('.js'))
    .forEach((file) => files.push(path.resolve(path.join(folder, file))));
});

files.forEach((file) => {
  if (file === __filename) return;
  console.error('Checking', file);
  const error = syntaxError(fs.readFileSync(file, 'utf8'), file, {
    sourceType: 'module',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
  });
  if (error) assert.ok(error.length < 1, `${file}\n\n${error}`);
  assert.ok(file);
  console.log('Done', file);
});
