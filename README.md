# bus-tracking

## Checklist

- [X] Collect a week's worth of GTFS-RT data for the whole of the UK.
- [X] Download the GTFS timetable for those days / that week.
- [X] Re-write the BODS2GTFS code in Python (was in C#.NET before).
- [X] Update the code to work with GTFS-RT rather the Siri-VM.
- [X] Publish the code and data on GitHub.
- [ ] Complete QA on the new code.
- [ ] ~~Get MerseyRail GTFS-RT data for the trains?!~~
- [X] Analyse/Create charts for travel time isochrones of Liverpool buses/trains using OpenTripPlanner2
- [X] Create graphs of real journey times for individual bus/train routes throughout the week.

## Environment

The python environment is managed using `pipenv`. You'll need a working version of `pip` installed and on the path. You should have this if you have `python` installed. Install `pipenv` using `pip install pipenv`.

Next, navigate to this repository in the terminal. Run `pipenv sync` to install all packages (specified in Pipfile.lock). You can then use `pipenv shell` to activate the virutal env and install packages with `pipenv install <package_name>`.

If you're using VScode, you can load the jupyter notebook and choose the kernel associated with the virtual environment you created. This should allow you to run the notebooks with the required packages.

## Pipelines

`demo.ipynb` - Main script for matching realtime buses to the timetable.
`intersection.ipynb` - Programme to calculate geojson intersections for equal time isochrones over multiple days' data.
`utils.py` - General utility functions.
`gtfs-realtime-utils.py` - GTFS specific utility functions.

## Population calculator

A notebook to calculate populations inside isochrones for England.
Functions in `utils.py`. Main script is `calculator.ipynb`

## Report Site

A [Lume](https://lume.land) static site for tracking progress and visualisisng results for the project with LCRCA. This site is private and updates are no longer tracked on GitHub.

## Web

Realtime bus data for a tracking website (to be shared openly Dec 2024.)
`process.ipynb` is the main script for producing the data.
Data is organies by region (using NUTS codes).

Each data file is named by a unique ID, which is either scraped from [bustimes.org](https://bustimes.org), or failing that, the `route_short_name-agency_noc.json` e.g. `X84-FLDS.json`.

### Data Schema

#### `meta`: metadata about the bus service

- `id`: a unique id of the bus route.
- `name`: human readable equivalent of ID.
- `agency_name`: Name of the company operating the bus
- `agency_noc`: national operator code
- `bustimesorg`: boolean. Whether or not the meta info was matched with bustimes.org.

#### `line`: longitude/latitude coordinates specifying the route the bus takes

Keys are `shape_id` from the GTFS timetable.

Values an array of arrays containing long/lat pairs. E.g. [[`lon_1`, `lat_1`],...,[`lon_n`, `lat_n`]]

There can be more than one shape for each route.

#### `stops`: the stops on the route and information about them

Dictionary of stops on the route.

Keys are the `stop_id` of each stop on the route.

Values are:

- `name`: human name of the stop
- `lon`: longitude
- `lat`: latitude
- `bearing`: Direction of travel on an 8 point compass.

#### `trips`: the stop_id and arrival times of buses for stops on the route, according to the timetable, and the realtime data

`trips` is an array. Each item of the array is itself an array of stop times. Each stop time is an array of the form [`stop_id`, `realtime`, `timetable`].
`stop_id` is a unique identifier of the stop, `realtime` is a unixtimestamp of when the bus arrived at the stop and `timetable` is a timestamp of when the bus was timetabled to arrive at the stop.

## R

DEPRACATED: Exploring use of R5R to create travel time isochrones.

## GTFS/GTFS-RT Docs

Documentation on GTFS and GTFS-RT format can read <https://gtfs.org/documentation/overview/>. It takes a bit of time to get familiar with the GTFS format but the documentation is helpful and worth referring to.

You can verify GTFS timetables here <https://gtfs-validator.mobilitydata.org/>.

## one_off_scripts

`extract.py` - Extract the `gtfsrt.bin` file from the `gtfsrt.zip` that comes from BODS for all the live location data we downloaded.

`rename.py` - rename a file endings to `.zip`
