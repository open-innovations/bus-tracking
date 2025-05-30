# Full workflow

- Download the latest GTFS timetable from BODS
- Collect live location data from BODS
- Run the live location data through `gtfsrt_to_csv.ipynb` to simplify the data.
- Run `gtfsrt2gtfs_interpolation.ipynb` using the CSV files to correct the timetable and use interpolaiton to fill gaps. This method assumes `stop_sequence` is available in the data.
- Validate the 'real' GTFS timetables using the MobilityData validtor.
- Follow the steps to set up OTP. You'll need version 2.2 - 2.5 and ensure you've enabled the traveltime sandbox API using the `otp-config.json` file.
- Use both versions of the timetables to create the isochrones you need. Timetable won't vary much in weekdays so just pick one day. For real time, you need to create one per day of the data you've recorded. 
- Use GIS/Python to find the overlapping areas of the 'real' geojson isochrones.
- Use the population calculator to find the populations of each isochrone.
- Put them on a map to show the difference.
