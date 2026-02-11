import os
import glob
from PIL import Image
from pillow_heif import register_heif_opener

# Register HEIF opener with Pillow
register_heif_opener()

# Configuration
MAX_WIDTH = 1920  # Maximum width for web images
QUALITY = 75      # JPEG quality (70-80 is optimal for web)
TARGET_SIZE_KB = 200  # Target max size in KB

def get_file_size_kb(path):
    return os.path.getsize(path) / 1024

def compress_image(img_path, output_path, max_width=MAX_WIDTH, quality=QUALITY):
    """Compress and resize image for web use."""
    try:
        with Image.open(img_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'P', 'LA'):
                img = img.convert('RGB')
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Calculate new size maintaining aspect ratio
            width, height = img.size
            if width > max_width:
                ratio = max_width / width
                new_height = int(height * ratio)
                img = img.resize((max_width, new_height), Image.LANCZOS)
            
            # Save with progressive JPEG for faster loading
            img.save(output_path, 'JPEG', quality=quality, optimize=True, progressive=True)
            
            return True
    except Exception as e:
        print(f"Error compressing {img_path}: {e}")
        return False

def process_folder(folder_path, replace=True):
    """Process all images in a folder."""
    # Find all image files
    extensions = ['*.jpg', '*.jpeg', '*.JPG', '*.JPEG', '*.JPG.jpeg', '*.png', '*.PNG']
    image_files = []
    for ext in extensions:
        image_files.extend(glob.glob(os.path.join(folder_path, ext)))
    
    print(f"\n{'='*60}")
    print(f"Processing folder: {folder_path}")
    print(f"Found {len(image_files)} images")
    print(f"{'='*60}\n")
    
    total_saved = 0
    
    for img_path in image_files:
        original_size = get_file_size_kb(img_path)
        
        # Skip already small images
        if original_size < TARGET_SIZE_KB:
            print(f"[OK] Skip (already small): {os.path.basename(img_path)} ({original_size:.0f}KB)")
            continue
        
        # Create backup filename or temp file
        if replace:
            temp_path = img_path + '.temp.jpg'
            output_path = img_path.rsplit('.', 1)[0] + '.jpg' if not img_path.lower().endswith('.jpg') else img_path
        else:
            output_path = img_path.rsplit('.', 1)[0] + '_compressed.jpg'
        
        # Compress
        if compress_image(img_path, temp_path if replace else output_path):
            new_size = get_file_size_kb(temp_path if replace else output_path)
            saved = original_size - new_size
            total_saved += saved
            
            if replace:
                # Replace original with compressed
                os.remove(img_path)
                # Rename to proper jpg extension
                final_path = img_path.rsplit('.', 1)[0] + '.jpg'
                if img_path.endswith('.JPG.jpeg'):
                    final_path = img_path.replace('.JPG.jpeg', '.jpg')
                os.rename(temp_path, final_path)
            
            print(f"[OK] Compressed: {os.path.basename(img_path)}")
            print(f"  {original_size:.0f}KB -> {new_size:.0f}KB (saved {saved:.0f}KB, {(saved/original_size)*100:.0f}%)")
    
    print(f"\n{'='*60}")
    print(f"Total saved: {total_saved/1024:.2f}MB")
    print(f"{'='*60}\n")

def compress_logo(logo_path):
    """Compress the logo image."""
    if not os.path.exists(logo_path):
        print(f"Logo not found: {logo_path}")
        return
    
    original_size = get_file_size_kb(logo_path)
    print(f"\nCompressing logo: {logo_path}")
    print(f"Original size: {original_size:.0f}KB")
    
    # For logo, use PNG with optimization or convert to optimized JPEG
    try:
        with Image.open(logo_path) as img:
            # Resize if too large
            max_logo_width = 500
            width, height = img.size
            if width > max_logo_width:
                ratio = max_logo_width / width
                new_height = int(height * ratio)
                img = img.resize((max_logo_width, new_height), Image.LANCZOS)
            
            # Save as optimized PNG (keeps transparency if any)
            if img.mode in ('RGBA', 'LA'):
                output_path = logo_path.rsplit('.', 1)[0] + '_optimized.png'
                img.save(output_path, 'PNG', optimize=True)
            else:
                # Convert to JPEG for better compression
                output_path = logo_path.rsplit('.', 1)[0] + '.jpg'
                rgb_img = img.convert('RGB')
                rgb_img.save(output_path, 'JPEG', quality=85, optimize=True)
            
            new_size = get_file_size_kb(output_path)
            print(f"New size: {new_size:.0f}KB (saved {original_size - new_size:.0f}KB)")
            
    except Exception as e:
        print(f"Error compressing logo: {e}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Process MedicalCamp folder
    medical_camp = os.path.join(base_dir, "MedicalCamp")
    if os.path.exists(medical_camp):
        process_folder(medical_camp, replace=True)
    
    # Process Dr.Deepika folder
    dr_deepika = os.path.join(base_dir, "Dr.Deepika")
    if os.path.exists(dr_deepika):
        process_folder(dr_deepika, replace=True)
    
    # Compress logo
    logo_path = os.path.join(base_dir, "NewLogo.png")
    compress_logo(logo_path)
    
    print("\n[DONE] Image compression complete!")
    print("Remember to update image references in index.html if file extensions changed.")
