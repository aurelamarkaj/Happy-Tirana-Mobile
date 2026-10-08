// Rasterize the existing clean SVG logo for native launcher icons; no logo redesign.
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
async function main() {
  const logo = await sharp(path.join(root, 'assets/happy-logo.svg'), { density: 192 })
    .resize(640, 640, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).png().toBuffer();
  await sharp(logo).extend({ top: 192, bottom: 192, left: 192, right: 192, background: '#ffffff' })
    .png().toFile(path.join(root, 'assets/icon.png'));
  console.log('Native icon generated from the existing logo: assets/icon.png');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
