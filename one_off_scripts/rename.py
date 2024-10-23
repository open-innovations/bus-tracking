import os

directory_path = 'data/gtfs-rt/FullDays/'

if __name__ == "__main__":
    for filename in os.listdir(directory_path):
        # Construct the full file path
        file_path = os.path.join(directory_path, filename)

        # Check if it's a file (and not a directory)
        if os.path.isfile(file_path):
            # Change the file extension to .zip
            new_filename = os.path.splitext(filename)[0] + '.zip' 
            new_file_path = os.path.join(directory_path, new_filename)
            
            # Rename the file
            os.rename(file_path, new_file_path)
            print(f'Renamed: {filename} -> {new_filename}')

    print('All files have been renamed to .zip')
