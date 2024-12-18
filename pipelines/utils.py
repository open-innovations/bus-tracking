import pandas as pd
from pathlib import Path
import zipfile
from io import TextIOWrapper
import os
import time
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

def load_full_gtfs(path, include=None):
    """
    Read GTFS files from path (can be either a zip file or directory containing the individual files) and get the required components. Additionally, read any optional files specified in `include`.

    Parameters
    ----------
    dir: str
        Directory of the GTFS unzipped files.
    
    include: list(str)
        Optional filenames to include that are not required by GTFS but are optionally included.

    Returns
    -------
    result: list(pandas.DataFrame)
        A list of pandas dataframes containing the loaded data files. Order is the same as required files, then include.
    """
    # Required by GTFS
    required_files = ['agency.txt', 'routes.txt', 'trips.txt', 'stops.txt', 'stop_times.txt', 'calendar.txt', 'calendar_dates.txt']

    # Add extra files to read
    if include:
        for file in include:
            required_files.append(file)
    
    result = []

    if path.suffix == '.zip':
        print(f'File "{path}" is a zip file. Unzipping and reading...')
         # Open the zip file
        with zipfile.ZipFile(path, 'r') as z:
            # Read the files
            for file in required_files:
                if file in z.namelist():  # Check if file exists in the zip
                    with z.open(file) as f:
                        data = pd.read_csv(TextIOWrapper(f, 'utf-8'), low_memory=False)
                        result.append(data)
    else:
        assert os.path.isdir(path), f"{path} is not a directory."
        print("Reading GTFS files...")
        # Read the files
        for file in required_files:
            fp = os.path.join(path, file)
            data = pd.read_csv(fp, low_memory=False)
            result.append(data)
    
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

def convert_to_unix_timestamp(time, date_str):
    '''Convert HHMMSS format, potentially with HH > 23, to a unix timestamp.'''
    # Handle the case where the hour is 24
    time_value = date_str + ' ' + time
    hh = int(time_value[11:13])
    n_days = hh // 24
    if n_days > 0:
        newhh = str(int(hh - 24*n_days))
        # print('newhh', newhh)
        if len(newhh) == 1:
            newhh = newhh.zfill(2)
        # print('newhh', newhh)
        # print('hh', hh)
        time_value = time_value.replace(f'{hh}:', f'{newhh}:')  # Replace 24: with 00:
        # print(time_value, 'h')
        date_obj = datetime.strptime(time_value, r'%Y-%m-%d %H:%M:%S') + timedelta(days=2)  # Increment the day
    else:
        date_obj = datetime.strptime(time_value, r'%Y-%m-%d %H:%M:%S')
    # print(date_obj)
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

def make_date_with_dashes(date):
    assert len(date) == 8, 'Date appears to be wrong length.'
    return f"{date[0:4]}-{date[4:6]}-{date[6:8]}"