import geopandas as gpd
import pandas as pd
import os
from pathlib import Path
from shapely.geometry import Point

def load_population_data():
    '''Load a dataframe of population and convert the lat,longs to a Point object.'''
    data = pd.read_csv('OA21CD_population.csv')
    # Create a 'geometry' column with Point objects
    data['geometry'] = data.apply(lambda row: Point(row['longitude'], row['latitude']), axis=1)

    # Convert the DataFrame into a GeoDataFrame
    gdf = gpd.GeoDataFrame(data, geometry='geometry')

    # Set the coordinate reference system (CRS) to WGS84 (EPSG:4326)
    gdf.set_crs(epsg=4326, inplace=True)
    return data

def load_geojson(path):
    '''Load a geojson into a geo dataframe/geo series'''
    data = gpd.read_file(path)
    return data

def calculate_population(path):
    population = load_population_data()
    geodata = load_geojson(path)
    
    population['contained'] = population['geometry'].apply(lambda point: geodata['geometry'].contains(point).any())

    # Filter the points that are contained within the multipolygons
    contained_points = population[population['contained']]
    # Print the population
    print('Population estimate:', contained_points['Total'].sum())
    return contained_points

def calculate_area_sqkm(gdf):
    gdf = gdf.set_crs("epsg:4326")
    gdf = gdf.to_crs("epsg:6933")
    gdf["SqKm"] = gdf.area / 1e6
    return gdf