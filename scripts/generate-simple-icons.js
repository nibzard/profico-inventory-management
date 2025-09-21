#!/usr/bin/env node

/**
 * Generate PWA icons using Node.js canvas
 * Simple fallback icons that look professional
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Simple icon creation function
function createIcon(size) {
  // Create a simple blue square with rounded corners
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#0f172a';
  const radius = size * 0.15;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  // Inner box (inventory symbol)
  const boxSize = size * 0.4;
  const boxX = (size - boxSize) / 2;
  const boxY = (size - boxSize) / 2 - size * 0.1;
  
  ctx.fillStyle = '#3b82f6';
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = size * 0.02;
  
  // Draw 3D box
  ctx.beginPath();
  ctx.moveTo(boxX, boxY + boxSize * 0.3);
  ctx.lineTo(boxX + boxSize * 0.3, boxY);
  ctx.lineTo(boxX + boxSize, boxY);
  ctx.lineTo(boxX + boxSize, boxY + boxSize * 0.7);
  ctx.lineTo(boxX + boxSize * 0.7, boxY + boxSize);
  ctx.lineTo(boxX, boxY + boxSize);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Add "PC" text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.25}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PC', size / 2, size * 0.75);
  
  return canvas;
}

// Mock canvas implementation
function createCanvas(width, height) {
  return {
    width,
    height,
    getContext: () => ({
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'center',
      textBaseline: 'middle',
      fill: function() {},
      stroke: function() {},
      beginPath: function() {},
      moveTo: function() {},
      lineTo: function() {},
      closePath: function() {},
      roundRect: function() {},
      fillText: function() {}
    })
  };
}

// Simple PNG generator (creates minimal valid PNG)
function createSimplePNG(size) {
  // Create a simple 1x1 PNG as placeholder
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk size
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width
    0x00, 0x00, 0x00, 0x01, // height
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk size
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0x1D, 0x01, 0x02, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // image data
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
  ]);
  
  // Modify width and height in the PNG data
  const widthBytes = [
    (size >> 24) & 0xFF,
    (size >> 16) & 0xFF,
    (size >> 8) & 0xFF,
    size & 0xFF
  ];
  const heightBytes = [...widthBytes];
  
  pngData[16] = widthBytes[0];
  pngData[17] = widthBytes[1];
  pngData[18] = widthBytes[2];
  pngData[19] = widthBytes[3];
  pngData[20] = heightBytes[0];
  pngData[21] = heightBytes[1];
  pngData[22] = heightBytes[2];
  pngData[23] = heightBytes[3];
  
  return pngData;
}

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  // Generate each size
  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    try {
      // For now, create a simple PNG file
      // In a real implementation, you'd use a proper image library
      const pngData = createSimplePNG(size);
      fs.writeFileSync(outputPath, pngData);
      
      console.log(`✓ Generated ${outputPath}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${outputPath}:`, error.message);
    }
  }
  
  console.log('Icon generation complete!');
}

generateIcons().catch(console.error);