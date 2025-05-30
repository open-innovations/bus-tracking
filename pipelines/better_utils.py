import glob
import pandas as pd
from zipfile import ZipFile
from google.transit import gtfs_realtime_pb2

class GTFSTimetable:
    '''
    Load a GTFS zip file into a class for easy manipulation.
    
    Attributes
    ----------
    files: list
        a list of files in the Zip file.
    dfs: dict     
        a dictionary of pandas.DataFrame (s) where the key is the name of the file and the value is the dataframe.
    '''
    def __init__(self, path:str, file_type=".txt"):
        if str(path).endswith(".zip"):
            with ZipFile(path) as zf:
                # create a dictionary containing the data as dataframes
                # indexed by the filename (extension removed)
                self.dfs = {text_file.filename.replace(file_type, ""): pd.read_csv(zf.open(text_file.filename))
                            for text_file in zf.infolist()
                            if text_file.filename.endswith(file_type)}
                
                # add a list of files
                self.files = zf.namelist()

def get_gtfs_from_binaries(paths: list):
    entities = []
    feed = gtfs_realtime_pb2.FeedMessage()

    assert len(paths) > 0, "paths is empty."

    for path in paths:
        if path.endswith(".bin"):
            with open(path, 'rb') as f:
                feed.ParseFromString(f.read())
                entities = entities + [e for e in feed.entity]
        else:
            print(f"{path} is not a binary file.")
    return entities

def get_gtfs_entities_from_zips(paths:list, bin_file='gtfsrt.bin'):
    '''
    Get the GTFS-RT entities, from a list of filepaths, as a list.

    Params
    ------
    paths: list
        A list of paths 
    bin_file: str
        The name of the binary file you expect to find in each zip file.
    '''
    entities = []
    feed = gtfs_realtime_pb2.FeedMessage()

    assert len(paths) > 0, "paths is empty."

    for path in paths:
        if path.endswith(".zip"):
            with ZipFile(path) as zf:
                if bin_file in zf.namelist():
                    with zf.open(bin_file, 'r') as f:
                        feed.ParseFromString(f.read())
                        entities = entities + [e for e in feed.entity]
                else: 
                    print(f'{bin_file} is not contained within {path}. Skipping to next zip file.')
        else: 
            print(f"{path} is not a zip file.")
    return entities

def get_gtfs_entities_from_directory(DIR: str):
    '''
    Get the GTFS-RT entities, from a directory of zip files containing gtfsrt binary files, as a list.

    Params
    ------
    DIR: str
        path to directory containing zip files. May also include other, non-zip files (these are ignored).
    '''
    return get_gtfs_entities_from_zips(glob.glob(DIR + '/*.zip'))
