import rawpy
import imageio.v3 as iio
import os
import glob
from PIL import Image
import traceback

def convert_dng_to_jpg(source_folder):
    dng_files = glob.glob(os.path.join(source_folder, "*.DNG"))
    
    if not dng_files:
        print(f"No .DNG files found in {source_folder}")
        return

    print(f"Found {len(dng_files)} DNG files. Starting conversion...")

    for dng_path in dng_files:
        base_name = os.path.splitext(os.path.basename(dng_path))[0]
        jpg_path = os.path.join(source_folder, f"{base_name}.jpg")
        
        if os.path.exists(jpg_path):
            print(f"Skipping {base_name}.jpg (already exists)")
            continue

        print(f"Attempting to convert {base_name}.DNG...")
        
        # Method 1: Try rawpy again (just in case, but unlikely if failed before)
        try:
            with rawpy.imread(dng_path) as raw:
                rgb = raw.postprocess()
                Image.fromarray(rgb).save(jpg_path, "JPEG", quality=85)
                print(f"Success with rawpy: {base_name}.DNG")
                continue
        except Exception as e:
            print(f"rawpy failed: {e}")

        # Method 2: Try imageio
        try:
            # imageio can sometimes read DNGs as TIFFs
            img = iio.imread(dng_path)
            # Normalize if needed (e.g. 16-bit to 8-bit)
            if img.dtype == 'uint16':
                img = (img / 256).astype('uint8')
            
            Image.fromarray(img).save(jpg_path, "JPEG", quality=85)
            print(f"Success with imageio: {base_name}.DNG")
            continue
        except Exception as e:
            print(f"imageio failed: {e}")

        # Method 3: Try PIL directly
        try:
            with Image.open(dng_path) as img:
                img = img.convert("RGB")
                img.save(jpg_path, "JPEG", quality=85)
                print(f"Success with PIL: {base_name}.DNG")
                continue
        except Exception as e:
            print(f"PIL failed: {e}")

        print(f"All methods failed for {base_name}.DNG")

if __name__ == "__main__":
    medical_camp_folder = os.path.join(os.getcwd(), "MedicalCamp")
    convert_dng_to_jpg(medical_camp_folder)
