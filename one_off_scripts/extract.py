import os
import zipfile

zip_dir = "data/gtfs-rt/FullDays"
extract_dir = "data/gtfs-rt"

os.makedirs(extract_dir, exist_ok=True)

if __name__ == "__main__":
    # Iterate through each file in the ZIP directory
    for zip_filename in os.listdir(zip_dir):
        # Check if the file is a ZIP file
        if zip_filename.endswith('.zip'):
            # Construct full path to the ZIP file
            zip_path = os.path.join(zip_dir, zip_filename)
            try:
                with zipfile.ZipFile(zip_path, 'r') as zip_file:
                    # Check if 'gtfsrt.bin' exists in the ZIP file
                    if 'gtfsrt.bin' in zip_file.namelist():
                        # Extract the 'gtfsrt.bin' file
                        with zip_file.open('gtfsrt.bin') as bin_file:
                            # Construct the output file name based on the ZIP file's name
                            output_filename = os.path.join(extract_dir, zip_filename.replace('.zip', '.bin'))

                            # Write the extracted file to the output directory
                            with open(output_filename, 'wb') as output_file:
                                output_file.write(bin_file.read())

                        print(f"Extracted {zip_filename} to {output_filename}")
                    else:
                        print(f"'gtfsrt.bin' not found in {zip_filename}")
            except (zipfile.BadZipFile, zipfile.LargeZipFile) as e:
                print(f"Skipping bad zip file: {zip_path} - {e}")