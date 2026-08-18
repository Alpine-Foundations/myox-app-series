import fs from 'fs';
import path from 'path';

const srcLogo = path.resolve('MyOxia Logo.png');
const publicDir = path.resolve('public');

if (fs.existsSync(srcLogo)) {
  fs.copyFileSync(srcLogo, path.join(publicDir, 'logo.png'));
  fs.copyFileSync(srcLogo, path.join(publicDir, 'favicon.png'));
  fs.copyFileSync(srcLogo, path.join(publicDir, 'apple-touch-icon.png'));
  fs.copyFileSync(srcLogo, path.join(publicDir, 'icon-192.png'));
  fs.copyFileSync(srcLogo, path.join(publicDir, 'icon-512.png'));
  console.log('✓ Successfully copied MyOxia Logo to public assets (favicon.png, logo.png, apple-touch-icon.png, icon-192.png, icon-512.png)');
} else {
  console.error('MyOxia Logo.png not found in root directory');
}
