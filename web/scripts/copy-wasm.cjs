const fs = require('fs');
const path = require('path');

const sourceDir = path.resolve(__dirname, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const destDir = path.resolve(__dirname, '..', 'public', 'wasm');

if (fs.existsSync(sourceDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(sourceDir, destDir, { recursive: true });
  console.log(`[SignMedic] Successfully copied MediaPipe WASM assets to ${destDir}`);
}
