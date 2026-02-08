import os
import glob
from PIL import Image
from pillow_heif import register_heif_opener
import imageio.v3 as iio

# Register HEIF opener with Pillow
register_heif_opener()

def convert_images(source_folder):
    # Find all HEIC files
    heic_files = glob.glob(os.path.join(source_folder, "*.HEIC"))
    heic_files += glob.glob(os.path.join(source_folder, "*.heic"))
    
    # Find PNG files to convert
    png_files = glob.glob(os.path.join(source_folder, "*.PNG"))
    png_files += glob.glob(os.path.join(source_folder, "*.png"))
    
    # Find DNG files
    dng_files = glob.glob(os.path.join(source_folder, "*.DNG"))
    dng_files += glob.glob(os.path.join(source_folder, "*.dng"))
    
    print(f"Found {len(heic_files)} HEIC, {len(png_files)} PNG, {len(dng_files)} DNG files")
    
    # Convert HEIC files
    for heic_path in heic_files:
        base_name = os.path.splitext(os.path.basename(heic_path))[0]
        jpg_path = os.path.join(source_folder, f"{base_name}.jpg")
        
        if os.path.exists(jpg_path):
            print(f"Skipping {base_name} (already exists)")
            continue
            
        try:
            print(f"Converting {base_name}.HEIC...")
            with Image.open(heic_path) as img:
                rgb_img = img.convert("RGB")
                rgb_img.save(jpg_path, "JPEG", quality=85, optimize=True)
            print(f"Success: {base_name}.jpg")
        except Exception as e:
            print(f"Error converting {heic_path}: {e}")
    
    # Convert PNG files
    for png_path in png_files:
        base_name = os.path.splitext(os.path.basename(png_path))[0]
        jpg_path = os.path.join(source_folder, f"{base_name}.jpg")
        
        if os.path.exists(jpg_path):
            print(f"Skipping {base_name} (already exists)")
            continue
            
        try:
            print(f"Converting {base_name}.PNG...")
            with Image.open(png_path) as img:
                rgb_img = img.convert("RGB")
                rgb_img.save(jpg_path, "JPEG", quality=85, optimize=True)
            print(f"Success: {base_name}.jpg")
        except Exception as e:
            print(f"Error converting {png_path}: {e}")
    
    # Convert DNG files using imageio
    for dng_path in dng_files:
        base_name = os.path.splitext(os.path.basename(dng_path))[0]
        jpg_path = os.path.join(source_folder, f"{base_name}.jpg")
        
        if os.path.exists(jpg_path):
            print(f"Skipping {base_name} (already exists)")
            continue
            
        try:
            print(f"Converting {base_name}.DNG...")
            img = iio.imread(dng_path)
            if img.dtype == 'uint16':
                img = (img / 256).astype('uint8')
            Image.fromarray(img).save(jpg_path, "JPEG", quality=85)
            print(f"Success: {base_name}.jpg")
        except Exception as e:
            print(f"Error converting {dng_path}: {e}")

if __name__ == "__main__":
    medical_camp_folder = os.path.join(os.getcwd(), "MedicalCamp")
    if os.path.exists(medical_camp_folder):
        convert_images(medical_camp_folder)
    else:
        print(f"Folder not found: {medical_camp_folder}")
