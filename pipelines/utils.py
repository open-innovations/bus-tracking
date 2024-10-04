import pandas as pd
from pathlib import Path
import zipfile
import os
import time
import numpy as np

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

        # if file == 'calendar.txt':
        #     calendar = data
        #     print('Loaded calendar.txt')
        # if file == 'calendar_dates.txt':
        #     calendar_dates = data
        #     print('Loaded calendar_dates.txt')

        if file == 'routes.txt':
            routes = data[['agency_id', 'route_id', 'route_short_name', 'route_type']]
            print('Loaded routes.txt')
    
    return agencies, routes, stops, stop_times, trips

def load_full_gtfs(dir):
    files_in_path = os.listdir(dir)
    required_files = ['agency.txt', 'routes.txt', 'trips.txt', 'stops.txt', 'stop_times.txt', 'calendar.txt' 'calendar_dates.txt']
    for file in required_files:
        assert file in files_in_path, f"The file {file} is required but is not present in the folder directory {dir}"
        fp = os.path.join(dir, file)
        data = pd.read_csv(fp, low_memory=False)
        if file == 'agency.txt':
            agencies = data
        if file == 'stops.txt':
            stops = data
        if file == 'stop_times.txt':
            stop_times = data
        if file == 'trips.txt':
            trips = data
        if file == 'calendar.txt':
            calendar = data
        if file == 'calendar_dates.txt':
            calendar_dates = data
        if file == 'routes.txt':
            routes = data
    
    result = [agencies, routes, trips, stops, stop_times, calendar, calendar_dates]

    if len(files_in_path) > len(required_files):
        print('Loading additional non-required files.')
        for file in files_in_path and file not in required_files:
            if file == 'feed_info.txt':
                feed_info = data
                result.append(feed_info)
            if file == 'frequencies.txt':
                frequencies = data
                result.append(frequencies)
            if file == 'shapes.txt':
                shapes = data
                result.append(shapes)
    
    return result
        
    