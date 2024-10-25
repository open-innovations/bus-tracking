import geopandas as gpd
import pandas as pd
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

def estimate_population(path:str, where:None, return_frame=False):
    """Estimate population in a geojson shape in England.
    
    Parameters
    ----------
    path: str
        path the geojson/json file.
    where: dict (optional)
        select features from the FeatureCollection using `property_name: value` pairs stored in a dictionary. 
        slices like pandas using `df[df[property_name] == value]`. 

    Returns
    -------
    total: np.int
        estimated population

    contained_points: geodataframe
        Dataframe of the Output areas that are inside the geometry.
    """
    population = load_population_data()
    geodata = load_geojson(path)
    if where:
        for property_name, value in where.items():
            geodata = geodata[geodata[property_name] == value].copy()
    print('Using the following geometry:\n', geodata.to_csv())
    population['contained'] = population['geometry'].apply(lambda point: geodata['geometry'].contains(point).any())

    # Filter the points that are contained within the multipolygons
    contained_points = population[population['contained']]
    # Print the population
    total = contained_points['Total'].sum()
    
    if return_frame:
        return total, contained_points
    
    return total

def calculate_area_sqkm(gdf):
    gdf = gdf.set_crs("epsg:4326")
    gdf = gdf.to_crs("epsg:6933")
    gdf["SqKm"] = gdf.area / 1e6
    return gdf