import fs from 'fs';
import path from 'path';

const src = 'C:/Users/Sayan Singha/.gemini/antigravity/brain/57d357e9-e03d-46f9-8447-596c8dd9dd8c/.user_uploaded/media_1789134381341.png';
const dest = path.resolve('public/bahon-logo.png');

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log(`Successfully copied ${src} to ${dest}`);
} else {
  console.error(`Source file not found: ${src}`);
}
