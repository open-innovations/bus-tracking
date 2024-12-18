from .gtfs_realtime_utils import *

def sirivm_to_dataframe(REALTIME_DATADIR, round=True, drop_duplicates=True, nth_file=None):
    '''Convert a directory of SiriVM files and create a dataframe of the data.'''
    
    ns = {'base': 'http://www.siri.org.uk/siri'} # namespace
    timestamp = []
    longitude = []
    latitude = []
    vehicle_ref = []
    bearing = []
    files = os.listdir(REALTIME_DATADIR)
    files.sort()
    # for file in os.listdir(REALTIME_DATADIR):
    for i in range(len(files)-1, -1, -1):
        if nth_file:
            if i % nth_file != 0:
                continue # Move to the next iteration of the loop.

        file = files[i]
        file_path = os.path.join(REALTIME_DATADIR, file)
        try:
            tree = ET.parse(file_path)
        except:
            print(file_path, 'could not be parsed. Skipping')
            continue
        root = tree.getroot()
        for e in root.findall(".//base:VehicleActivity", ns):
            try:
                t = e.find(".//base:RecordedAtTime", ns).text
                unix_time = int(datetime.fromisoformat(t).timestamp())
            except:
                unix_time = None
            try:
                lon = e.find("./base:MonitoredVehicleJourney/base:VehicleLocation/base:Longitude", ns).text
                lon=lon.strip()
            except:
                lon = None
            try:
                lat = e.find("./base:MonitoredVehicleJourney/base:VehicleLocation/base:Latitude", ns).text
                lat = lat.strip()
            except:
                lat = None
            try:
                ref = e.find("./base:MonitoredVehicleJourney/base:VehicleRef", ns).text
                ref = ref.strip()
            except:
                ref = None
            try:
                b = e.find("./base:MonitoredVehicleJourney/base:Bearing", ns).text
                b = b.strip()
            except:
                b = None
            timestamp.append(unix_time)
            longitude.append(lon)
            latitude.append(lat)
            vehicle_ref.append(ref)
            bearing.append(b)

    sirivm = pd.DataFrame({'timestamp': timestamp, 'latitude': latitude, 'longitude': longitude, 'vehicle_id': vehicle_ref, 'bearing': bearing})

    if round:
        sirivm['latitude'] = sirivm['latitude'].astype('Float64')
        sirivm['longitude'] = sirivm['longitude'].astype('Float64')
        sirivm = round_coordinates(sirivm, 'latitude', 'longitude', 4)

    if drop_duplicates:
        sirivm = remove_duplicate_locations(sirivm, subset=['timestamp', 'longitude', 'latitude', 'vehicle_id'],sortby=['vehicle_id', 'timestamp'])
        
    return sirivm