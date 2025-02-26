import pandas as pd
from pathlib import Path
import zipfile
from io import TextIOWrapper
import os
import time
import shutil
import pytz
from datetime import datetime, timedelta
# ROOT = Path(os.getcwd())
class BusDetail:
    '''Class to store information about individual bus locations'''
    def __init__(self) -> None:
        pass

def unzip_file(zip_file_path, extract_dir):
    '''
    Extract a zip file into a directory.
    Takes a zip file in zip_file_path and unzips to extract_dir.
    '''
    # Open the zip file
    with zipfile.ZipFile(zip_file_path, 'r') as zip:
        zip.extractall(extract_dir)
        file_paths = zip.namelist()
        
        # Go through each file in the zip archive
        for file_name in file_paths:
            # Construct the full file path of the extracted file
            full_file_path = os.path.join(extract_dir, file_name)
    print(f"Successfully unzipped all files in {zip_file_path} to {extract_dir}.")
    return

# ------ #

def load_gtfs_ids(gtfs_path):
    """
    Given an extracted folder of GTFS files, load the parts containing IDs into
    pandas dataframes using read_csv.

    Parameters
    -------
    gtfs_path: str
        The directory containing the extracted text files from the GTFS timetable

    Returns
    -------
    agencies: Pandas.DataFrame
        Contains "agency_id" and "agency_noc" columns.

    routes: Pandas.DataFrame
        Contains 'agency_id', 'route_id', 'route_short_name', 'route_type' columns.

    stops: Pandas.DataFrame
        Contains 'stop_id', 'stop_lat', 'stop_lon' columns.

    stop_times: Pandas.DataFrame
        Contains 'trip_id', 'stop_id' columns.
    
    trips: Pandas.DataFrame
        Contains 'trip_id', 'route_id' columns.
    """
    for file in os.listdir(gtfs_path):
        fp = os.path.join(gtfs_path, file)
        data = pd.read_csv(fp, low_memory=False)
        
        if file == 'agency.txt':
            agencies = data[['agency_id', 'agency_noc']]
            print('Loaded agency.txt')

        if file == 'stops.txt':
            stops = data[['stop_id', 'stop_lat', 'stop_lon']]
            print('Loaded stops.txt')

        if file == 'stop_times.txt':
            stop_times = data #[['trip_id', 'stop_id', 'stop_sequence']]
            print('Loaded stop_times.txt')

        if file == 'trips.txt':
            trips = data[['trip_id', 'route_id']]
            print('Loaded trips.txt')

        if file == 'routes.txt':
            routes = data[['agency_id', 'route_id', 'route_short_name', 'route_type']]
            print('Loaded routes.txt')
    
    return agencies, routes, stops, stop_times, trips

# ------ #

def load_gtfs(fpath, files=None):
    """
    Load specified files from a GTFS .zip file.

    Parameters
    ----------
        fpath (str): Path to the GTFS .zip file.
        files (list): List of file names to load. If None, loads all files in the archive.

    Returns
    -------
        list: A list of pandas DataFrames corresponding to the specified files.
    """
    if not str(fpath).endswith('.zip'):
        raise ValueError('The provided file is not a .zip file')

    with zipfile.ZipFile(fpath, 'r') as z:
        # Get the list of files in the archive
        available_files = z.namelist()
        print(available_files)
        # If no files are specified, load all files
        if files is None:
            files = available_files
        else:
            # Validate that all specified files exist in the archive
            missing_files = [file for file in files if file not in available_files]
            if missing_files:
                raise FileNotFoundError(f"The following files are missing in the archive: {missing_files}")

        # Load the specified files into DataFrames
        result = [
            pd.read_csv(TextIOWrapper(z.open(file), 'utf-8'), low_memory=False)
            for file in files
        ]

    return result

# ------ #

def get_stop_names_and_bearings(ROOT):
    """
    Get the bearings and full names for each stop_id in the UK NaPTAN database.

    Returns
    -------
    stop_names_bearings: pandas.DataFrame
        DataFrame with columns for stop_id, stop_name and Bearing
    """
    stop_names_bearings = pd.read_csv(os.path.abspath(ROOT / "data/uk_stops/stops.csv"), low_memory=False, usecols=['ATCOCode', 'CommonName', 'Bearing'])
    stop_names_bearings.rename(columns={"ATCOCode": "stop_id", "CommonName": "stop_name"}, inplace=True)
    stop_names_bearings['Bearing'] = stop_names_bearings['Bearing'].map(pd.Series({"N": 0, "NE": 45, "E": 90, "SE": 135, "S": 180, "SW": 225, "W": 270, "NW": 315}))
    return stop_names_bearings

# ------ #

def gtfs_time_to_unix_timestamp(time, date_str):
    '''Convert HHMMSS format, where hour can be > 23, to a unix timestamp.'''
    # Handle the case where the hour is >=24
    time_value = date_str + ' ' + time
    hh = int(time_value[11:13])
    n_days = hh // 24 # floor division gives number of days
    if n_days > 0:
        newhh = str(int(hh - 24*n_days)) # 
        if len(newhh) == 1:
            newhh = newhh.zfill(2)
        time_value = time_value.replace(f' {hh}:', f' {newhh}:')  # Replace 24: with 00:
        date_obj = datetime.strptime(time_value, r'%Y-%m-%d %H:%M:%S') + timedelta(days=n_days)  # Increment the day
    else:
        date_obj = datetime.strptime(time_value, r'%Y-%m-%d %H:%M:%S')
    # Convert to Unix timestamp - this also eliminates BST issues. Is detected automatically by system settings.
    result = int(date_obj.timestamp())
    return result

# ------ #

def fraction_with_trip_id(my_list):
    count = 0
    for item in my_list:
        if pd.notna(item):
            count += 1
    return round(100 * count / len(my_list), 5)

# ------ #
    
def fill_trip_ids(trip_id_list):
    '''Fill in the missing trip_ids from an ordered list of trip_ids.'''
    copy = trip_id_list.copy()
    saved_id = None
    for i in range(len(trip_id_list)):
        nth_id = trip_id_list[i]
        
        # So we don't raise an error when we get to the end of the list.
        if i == len(trip_id_list) - 1:
            break

        if pd.notna(nth_id):
            # If the nth_id exists (not an empty string), save the id and its index
            saved_id = nth_id
            saved_idx = i
        
        n_plus_oneth_id = trip_id_list[i+1]

        # If the nth id is an empty string, but the n plus one-th id is defined
        if pd.isna(nth_id) and pd.notna(n_plus_oneth_id):
            # If saved_id is defined.
            if pd.notna(saved_id):
            # If the n plus one-th id equals the previous saved_id.
                if n_plus_oneth_id == saved_id:
                    # set all the values between that previous row and the current row to be that trip_id. then move to the next iteration.
                    copy[saved_idx: i + 1] = [saved_id] * (i - saved_idx + 1)
    assert len(copy) == len(trip_id_list)
    return copy

# ------ #

def make_date_with_dashes(date):
    '''Returns a date in yyyy-mm-dd format. Input can be str or int.'''
    date = str(date)
    assert len(date) == 8, 'Date appears to be wrong length.'
    return f"{date[0:4]}-{date[4:6]}-{date[6:8]}"

# ------ #

def tz_offset(date:str, geo='Europe/London'):
    '''
    Calculate the number of hours timezone difference to UTC on a given date
    
    Parameters:
    ----------
    date: str 
        iso8061 date
    geo: str
        Default 'Europe/London'. See pytz.all_timezones for a full list
    
    Returns:
    --------
    offset_hours: int
        Number of hours offset to UTC
    '''
    date = datetime(int(date[0:4]), int(date[4:6]), int(date[6:8]))
    # Define the timezone (e.g., New York)
    tz = pytz.timezone(geo)
    # Make the date timezone-aware
    aware_date = tz.localize(date)
    # Get the UTC offset in hours
    offset_hours = aware_date.utcoffset().total_seconds() // 3600
    return int(offset_hours)

# ------ #

def zip_directory(folder_path, output_dir_path, output_filename):
    '''Zip a directory

    Params
    ------
    folder_path: path to the folder you want to zip
    output_dir_path: path to the place you want to save the zip file.
    output_filename: name of the zip file.

    '''
    # Ensure the output filename does not have a .zip extension
    if not output_filename.endswith('.zip'):
        output_filename += '.zip'
    # Join the output directory and filename
    output_zip_path = output_dir_path / output_filename
    
    # Create the zip archive in the specified directory
    shutil.make_archive(output_zip_path.with_suffix(''), 'zip', folder_path)
    print(f"Directory '{folder_path}' successfully zipped as '{output_filename}'.")

# ----- #

def unix_to_gtfs_time(unix_timestamps, date, tz):
    """
    Optimized conversion of Unix timestamps to GTFS time format (HH:MM:SS) with support for hours > 23.
    
    Parameters:
    -----------
    - unix_timestamps: A Pandas Series of Unix timestamps
    - date: A string or datetime representing the base date
    - tz: A integer value for the timezone difference to UTC
    
    Returns:
    --------
    - A Pandas Series of GTFS formatted times
    """
    # Precompute date conversion
    given_date = pd.to_datetime(date)
    # print('given date', given_date)
    # Convert Unix timestamps to datetime and extract time
    given_datetimes = pd.to_datetime(unix_timestamps, unit='s')
    # print('given datetimes', given_datetimes)
    time_strs = given_datetimes.dt.strftime('%H:%M:%S')
    # print('timestrs', time_strs)
    # Identify timestamps belonging to the next day
    is_next_day = given_datetimes.dt.date != given_date.date()
    # print(is_next_day)
    if not tz:
        tz = 0

    # Adjust hours for next-day times
    adjusted_times = (
        (is_next_day.astype(int) * 24 ) + (given_datetimes.dt.hour + tz)
    ).astype(int).astype(str).str.zfill(2) + time_strs.str[2:]
    # print(adjusted_times)
    return adjusted_times