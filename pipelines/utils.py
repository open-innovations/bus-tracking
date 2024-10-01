import pandas as pd
from pathlib import Path
import zipfile
import os
import time
import numpy as np
import geopandas as gpd
from shapely.geometry import Point

class BusDetail:
    def __init__(self) -> None:
        pass
    # def descri():
    #     print("")

# QUERY = """
# CREATE TABLE test AS
# SELECT 
#     * 
# FROM 
#     agencies as t1
# JOIN 
#     routes as t2 ON t1.agency_id = t2.agency_id
# JOIN
#     trips as t3 ON t2.route_id = t3.route_id
# JOIN
#     stop_times as t4 ON t4.trip_id = t3.trip_id
# JOIN
#     stops as t5 ON t5.stop_id = t4.stop_id;
# """
# STOP_QUERY = """
# SELECT 
#     * 
# FROM 
#     stop_times as t1
# JOIN
#     stops as t2 ON t2.stop_id = t1.stop_id;
# """
# AGGREGATE_STOPS = """
# SELECT 
#     trip_id,
#     ARRAY_AGG(stop_id) AS stop_ids,
#     ARRAY_AGG(stop_lat) AS stop_lats,
#     ARRAY_AGG(stop_lon) AS stop_lons
# FROM
#     stops
# GROUP BY 
#     trip_id;
# """

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
    return c * r
