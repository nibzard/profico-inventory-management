#!/bin/bash

# Generate PWA icons from SVG using ImageMagick
# This script creates proper PNG icons from the SVG source

ICONS_DIR="public/icons"
SVG_FILE="$ICONS_DIR/icon.svg"

# Check if SVG exists
if [ ! -f "$SVG_FILE" ]; then
    echo "Error: SVG file not found: $SVG_FILE"
    exit 1
fi

# Check if ImageMagick is available
if command -v convert >/dev/null 2>&1; then
    echo "Using ImageMagick to generate icons..."
    USE_IMAGEMAGICK=true
else
    echo "ImageMagick not found. Creating minimal PNG files..."
    USE_IMAGEMAGICK=false
fi

# Icon sizes
SIZES=(72 96 128 144 152 192 384 512)

for size in "${SIZES[@]}"; do
    output_file="$ICONS_DIR/icon-${size}x${size}.png"
    
    if [ "$USE_IMAGEMAGICK" = true ]; then
        # Use ImageMagick to convert SVG to PNG
        convert -background none -size "${size}x${size}" "$SVG_FILE" "$output_file"
        if [ $? -eq 0 ]; then
            echo "✓ Generated $output_file"
        else
            echo "✗ Failed to generate $output_file"
        fi
    else
        # Create a minimal PNG file (1x1 pixel)
        # This prevents 404 errors while being very small
        echo -en '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9c\x01\x02\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00IEND\xaeB`\x82' > "$output_file"
        echo "✓ Created minimal $output_file (1x1px placeholder)"
    fi
done

echo "Icon generation complete!"