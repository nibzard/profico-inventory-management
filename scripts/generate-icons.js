#!/usr/bin/env node

/**
 * Generate PWA icons from SVG using Node.js
 * Requires: npm install sharp
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');
const svgPath = path.join(iconsDir, 'icon.svg');

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  // Check if SVG exists
  if (!fs.existsSync(svgPath)) {
    console.error('SVG icon not found:', svgPath);
    process.exit(1);
  }
  
  // Generate each size
  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated ${outputPath}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${outputPath}:`, error.message);
    }
  }
  
  console.log('Icon generation complete!');
}

generateIcons().catch(console.error);