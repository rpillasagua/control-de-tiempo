const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImagePath = path.join(__dirname, '../public/logo.png');
const outputDir = path.join(__dirname, '../public');

const sizes = [192, 512];

async function generateIcons() {
  if (!fs.existsSync(inputImagePath)) {
    console.error(`Input image not found: ${inputImagePath}`);
    process.exit(1);
  }

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    await sharp(inputImagePath)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(outputPath);
    console.log(`Generated ${outputPath}`);
  }

  // Also create apple-touch-icon
  const applePath = path.join(outputDir, 'apple-touch-icon.png');
  await sharp(inputImagePath)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toFile(applePath);
  console.log(`Generated ${applePath}`);
}

generateIcons().catch(console.error);
