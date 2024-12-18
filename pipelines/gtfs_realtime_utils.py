
import numpy as np
import geopandas as gpd
import os
import pandas as pd
import xml.etree.ElementTree as ET

from google.transit import gtfs_realtime_pb2
from datetime import datetime
from shapely.geometry import GeometryCollection

def haversine(lat1, lon1, lat2, lon2):
    '''Calculate the distance between 2 pairs of coordinates on a spherical surface'''
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

# ------ #

def intersect_geojson_files(file_list):
    '''Calculate the intersection of two or more geojsons.'''
    # Load the first GeoJSON file as a GeoDataFrame
    gdf = gpd.read_file(file_list[0])

    # Loop over the remaining files and compute the intersection
    for file in file_list[1:]:
        gdf_other = gpd.read_file(file)
        gdf = gpd.overlay(gdf, gdf_other, how='intersection', keep_geom_type=False)
    # Filter out GeometryCollection if they are present
    gdf = gdf[~gdf.geometry.apply(lambda geom: isinstance(geom, GeometryCollection))]

    return gdf

# ------ #

def entities_to_list(feed, filepaths, nth_file):
    '''Parse a list of GTFS-RT filepaths into a list of entities containing their data'''
    entities = []
    # sort files into time order
    filepaths.sort()
    for i in range(len(filepaths)-1, -1, -1):
        # Only parse every nth file
        if nth_file:
            if i % nth_file != 0:
                continue # Move to the next iteration of the loop.
        gtfsrt_file = filepaths[i]
        # Read the GTFS-RT file
        # Ensure we're reading a binary file and not the readme.md or anything else accidentally.
        if '.bin' in str(gtfsrt_file):
            with open(gtfsrt_file, 'rb') as file:
                feed.ParseFromString(file.read())
                for entity in feed.entity:
                    entities.append(entity)

    return entities

# ------ #

def get_entity_metadata(entities):
    '''Create metadata about trip_ids in a list of GTFS-RT entities.'''
    t, r, st, sd = 0, 0, 0, 0
    for e in entities:
        trip = e.vehicle.trip
        # If trip_id is empty, count it, then check if route_id, start_date, start_time are populated.
        if not trip.trip_id:
            t += 1
            if trip.route_id:
                r += 1
            if trip.start_time:
                st += 1
            if trip.start_date:
                sd += 1
    
    d = pd.DataFrame(
            data=[t, r, st, sd], 
            index=['No trip_id', 'No trip_id but has a route_id', 'No trip_id but has start_time', 'No trip_id but has start_date'], 
            columns=['percent_of_entities']
            ).mul(100).div(len(entities))

    return d

# ------ #

def gtfsrt_filepaths_to_list(dir, date):
    '''Create a list of absolute paths to each GTFS-RT file in a directory'''
    date_with_dashes = f"{date[0:4]}-{date[4:6]}-{date[6:8]}"
    # Create an empty list to store file paths
    gtfs_rt_file_paths = []

    # Walk through the directory
    for root, dirs, files in os.walk(dir):
        for file in files:
            # Get the full path of the file and append it to the list
            if date_with_dashes in file: #@TODO improve the slice here to a regex match for the date.
                full_path = os.path.abspath(os.path.join(root, file))
                gtfs_rt_file_paths.append(full_path)
    
    return gtfs_rt_file_paths

# ------ #

def entity_list_to_df(entities):
    '''Create a dataframe from a list of GTFS-RT entities'''
    trip_ids = []
    start_times = []
    start_dates = []
    schedule_relationships = []
    route_ids = []
    latitude = []
    longitude = []
    bearing = []
    stop_sequence = []
    status = []
    timestamps = []
    vehicle_ids = []
    print(f"There are {len(entities)} entities.")
    for e in entities:
        v = e.vehicle
        trip_ids.append(v.trip.trip_id)
        start_times.append(v.trip.start_time)
        start_dates.append(v.trip.start_date)
        schedule_relationships.append(v.trip.schedule_relationship)
        route_ids.append(v.trip.route_id)
        longitude.append(v.position.longitude)
        latitude.append(v.position.latitude)
        bearing.append(v.position.bearing)
        stop_sequence.append(v.current_stop_sequence)
        status.append(v.current_status)
        timestamps.append(v.timestamp)
        vehicle_ids.append(v.vehicle.id)

    data = pd.DataFrame({'trip_id': trip_ids, 'start_time': start_times, 'start_date': start_dates, 'schedule_relationship': schedule_relationships, 'route_id': route_ids,
                        'latitude': latitude, 'longitude': longitude, 'bearing': bearing, 'stop_sequence': stop_sequence, 'status': status, 'timestamp': timestamps, 'vehicle_id': vehicle_ids})

    return data

# ------ #

def round_coordinates(df, x_name, y_name, precision=4):

    df[x_name] = df[x_name].round(precision)
    df[y_name] = df[y_name].round(precision)

    return df

# ------ #

def remove_duplicate_locations(df, subset=['longitude', 'latitude', 'timestamp', 'vehicle_id', 'trip_id'], sortby=['vehicle_id', 'timestamp', 'trip_id']):
    '''Removes duplicate data and sorts the resulting dataframe. Prints the fraction of data that was duplicated.'''
    # Sort the data
    df.sort_values(by=sortby, ascending=True, inplace=True)
    with_duplicates = len(df)
    df.drop_duplicates(subset=subset, keep='first', inplace=True) # The first/last here shouldn't matter as one of the duplicate fields is timestamp. So these are data points that are for the same point in time too.
    without_duplicates = len(df)
    fraction_duplicated = 1 - without_duplicates/with_duplicates
    print(f"Fraction of data that was duplictaed in 'longitude', 'latitude', 'timestamp', 'vehicle_id', 'trip_id':{fraction_duplicated}")

    return df

# ------ #

def gtfsrt_to_dataframe(REALTIME_DATADIR, date, round=True, drop_duplictaes=True, nth_file=None):
    '''Convert a directory of binary GTFSRT files and create a dataframe of the data.'''
    # Ensure date is a string
    date = str(date)
    
    # Load the full paths of the GTFS-RT files.
    gtfsrt_filepaths = gtfsrt_filepaths_to_list(dir=REALTIME_DATADIR, date=date)

    # Initialise the feed object
    feed = gtfs_realtime_pb2.FeedMessage()
    
    # Add all the entities (bus location objects) to a list to iterate through.
    entities = entities_to_list(feed, gtfsrt_filepaths, nth_file)
    print(f"Loaded data for {date}")

    # Add entities to a dataframe and cleanse the data
    data = entity_list_to_df(entities)
    
    if round:
        data = round_coordinates(data, 'latitude', 'longitude')
    
    if drop_duplictaes:
        data = remove_duplicate_locations(data)
    
    print(f"Created dataframe for {date}")

    return data

# ------ #