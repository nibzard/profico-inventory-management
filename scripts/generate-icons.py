#!/usr/bin/env python3
"""
Generate PWA icons from the main SVG file.
Requires: pip install pillow
"""

import os
from PIL import Image, ImageDraw, ImageFont
import xml.etree.ElementTree as ET

def parse_svg_dimensions(svg_path):
    """Parse SVG to get dimensions"""
    try:
        tree = ET.parse(svg_path)
        root = tree.getroot()
        width = int(root.get('width', '512'))
        height = int(root.get('height', '512'))
        return width, height
    except:
        return 512, 512

def create_fallback_icon(size, text="PC"):
    """Create a fallback icon with text"""
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw background circle
    margin = size // 8
    draw.ellipse([margin, margin, size - margin, size - margin], 
                 fill=(15, 23, 42, 255), outline=(59, 130, 246, 255), width=size//16)
    
    # Draw text
    try:
        # Try to use a system font
        font_size = size // 3
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        try:
            # Fallback to Arial
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            # Use default font
            font = ImageFont.load_default()
    
    # Get text dimensions
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center text
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    return img

def generate_icons():
    """Generate all required PWA icons"""
    base_dir = "public/icons"
    svg_path = os.path.join(base_dir, "icon.svg")
    
    # Required sizes from manifest.json
    sizes = [72, 96, 128, 144, 152, 192, 384, 512]
    
    # Check if we can use the SVG
    use_svg = os.path.exists(svg_path)
    
    if use_svg:
        try:
            # Try to convert SVG to PNG using PIL with cairosvg if available
            import cairosvg
            svg_to_png_available = True
        except ImportError:
            svg_to_png_available = False
            print("cairosvg not available, creating fallback icons")
    
    print(f"Generating icons for sizes: {sizes}")
    
    for size in sizes:
        output_path = os.path.join(base_dir, f"icon-{size}x{size}.png")
        
        if use_svg and svg_to_png_available:
            try:
                # Convert SVG to PNG
                cairosvg.svg2png(url=svg_path, write_to=output_path, output_width=size, output_height=size)
                print(f"✓ Generated {output_path} from SVG")
            except Exception as e:
                print(f"✗ Failed to generate {output_path} from SVG: {e}")
                # Create fallback
                img = create_fallback_icon(size)
                img.save(output_path, "PNG")
                print(f"✓ Generated fallback {output_path}")
        else:
            # Create fallback icon
            img = create_fallback_icon(size)
            img.save(output_path, "PNG")
            print(f"✓ Generated fallback {output_path}")
    
    print("Icon generation complete!")

if __name__ == "__main__":
    generate_icons()