#!/bin/bash

# Create minimal screenshot files to prevent 404 errors
# These are placeholder images that will be replaced with real screenshots later

SCREENSHOTS_DIR="public/screenshots"

# Ensure screenshots directory exists
mkdir -p "$SCREENSHOTS_DIR"

# Screenshot files mentioned in manifest.json
SCREENSHOTS=(
    "mobile-1.png:375x667"
    "mobile-2.png:375x812"
    "desktop-1.png:1280x720"
)

for screenshot in "${SCREENSHOTS[@]}"; do
    filename="${screenshot%%:*}"
    dimensions="${screenshot##*:}"
    
    output_file="$SCREENSHOTS_DIR/$filename"
    
    # Create a minimal PNG file
    echo -en '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9c\x01\x02\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00IEND\xaeB`\x82' > "$output_file"
    echo "✓ Created placeholder $output_file (1x1px placeholder)"
done

echo "Screenshot placeholders created!"