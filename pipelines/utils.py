import pandas as pd
from pathlib import Path
import zipfile
import os
import time
import numpy as np

ROOT = Path("../")
ROOT.resolve()
class BusDetail:
    def __init__(self) -> None:
        pass

def haversine(lat1, lon1, lat2, lon2):
    # Convert degrees to radians
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = np.sin(dlat / 2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2)**2
    c = 2 * np.arcsin(np.sqrt(a))

    # Earth radius in kilometers
    r = 6371
    return round(c * r, 5)

def unzip_file(zip_file_path, extract_dir):
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
            stop_times = data[['trip_id', 'stop_id']]
            print('Loaded stop_times.txt')

        if file == 'trips.txt':
            trips = data[['trip_id', 'route_id']]
            print('Loaded trips.txt')

        if file == 'routes.txt':
            routes = data[['agency_id', 'route_id', 'route_short_name', 'route_type']]
            print('Loaded routes.txt')
    
    return agencies, routes, stops, stop_times, trips

def load_full_gtfs(dir, include=None):
    """
    Read a directory containing GTFS files and get the required components. Additionally, read any optional files specified in `include`.

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
    # Read the files
    for file in required_files:
        fp = os.path.join(dir, file)
        data = pd.read_csv(fp, low_memory=False)
        result.append(data)
    
    return result

def get_stop_names_and_bearings():
    """
    Get the bearings and full names for each stop_id in the UK NaPTAN database.

    Returns
    -------
    stop_names_bearings: pandas.DataFrame
        DataFrame with columns for stop_id, stop_name and Bearing
    """
    stop_names_bearings = pd.read_csv(ROOT / "uk_stops/stops.csv", low_memory=False, usecols=['ATCOCode', 'CommonName', 'Bearing'])
    stop_names_bearings.rename(columns={"ATCOCode": "stop_id", "CommonName": "stop_name"}, inplace=True)
    stop_names_bearings['Bearing'] = stop_names_bearings['Bearing'].map(pd.Series({"N": 0, "NE": 45, "E": 90, "SE": 135, "S": 180, "SW": 225, "W": 270, "NW": 315}))
    return stop_names_bearings

def convert_to_unix_timestamp(df, time_column, date_str, time_format='%Y-%m-%d %H:%M:%S', hours_offset=1):
    """
    Converts a time column with 'HH:MM:SS' format and combines it with a given date string to generate Unix timestamps.
    
    Parameters
    ----------
    df (pd.DataFrame): The DataFrame containing the time column.

    time_column (str): The name of the column in 'HH:MM:SS' format.

    date_str (str): The date string to combine with the time.

    time_format (str): The datetime format of the combined date and time string. Default is '%Y-%m-%d %H:%M:%S'.

    hours_offset (int): The number of hours to subtract (default 1 for converting from BST to UTC).
    
    Returns
    -------
    pd.Series: A pandas Series with the Unix timestamps.
    """
    # Combine date string with time
    df[time_column] = date_str + ' ' + df[time_column]

    # Convert to datetime
    df[time_column] = pd.to_datetime(df[time_column], format=time_format)

    # Subtract the offset in hours (e.g., 1 hour to adjust from BST to UTC)
    df[time_column] = df[time_column] - pd.DateOffset(hours=hours_offset)

    # Convert the datetime objects to Unix timestamps (in seconds)
    return df[time_column].astype('int') / 10**9