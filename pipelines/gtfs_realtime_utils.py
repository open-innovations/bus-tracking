from shapely.geometry import GeometryCollection
import numpy as np
import geopandas as gpd
import pandas as pd
from google.transit import gtfs_realtime_pb2

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

# ------ #

def intersect_geojson_files(file_list):
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

def entities_to_list(feed, filepaths):
    entities = []
    for gtfsrt in filepaths:
        # Read the GTFS-RT file
        # Ensure we're reading a binary file and not the readme.md or anything else accidentally.
        if '.bin' in str(gtfsrt):
            with open(gtfsrt, 'rb') as file:
                feed.ParseFromString(file.read())
                for entity in feed.entity:
                    entities.append(entity)
    return entities

# ------ #

def get_entity_metadata(entities, path):
    ''''''
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
    
    # d.to_csv(path)

    return d