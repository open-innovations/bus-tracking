# bus-tracking

## Checklist

- [X] Collect a week's worth of GTFS-RT data for the whole of the UK.
- [X] Download the GTFS timetable for those days / that week.
- [X] Re-write the BODS2GTFS code in Python (was in C#.NET before).
- [X] Update the code to work with GTFS-RT rather the Siri-VM.
- [X] Publish the code and data on GitHub.
- [ ] Complete QA on the new code.
- [ ] ~~Get MerseyRail GTFS-RT data for the trains?!~~
- [X] Analyse/Create charts for travel time isochrones of Liverpool buses/trains using ~~OpenTripPlanner2~~ R5R.
- [X] Create graphs of real journey times for individual bus/train routes throughout the week.

## Environment

The environment is managed using `pipenv`. You'll need a working version of `pip` installed and on the path. You should have this if you have `python` installed. Install `pipenv` using `pip install pipenv`.

Next, navigate to this repository in the terminal. Run `pipenv sync` to install all packages (specified in Pipfile.lock). You can then use `pipenv shell` to activate the virutal env and install packages with `pipenv install <package_name>`.

If you're using VScode, you can load the jupyter notebook and choose the kernel associated with the virtual environment you created.

## Pipelines

The initial code to update a GTFS timetable with GTFS-RT data is in `GTFS-RT2GTFS.ipynb`. The code is in early stages; documentation will be updated significantly and the plan is to modularise the code to make it more readable. We also still need to QA the code through various tests and error handling.

`analysis.ipynb` contains an "out of the box" GTFS analysis on the real GTFS timetable for Yorkshire. We haven't verified any of this code as we didn't write it. It is intended as a proof on concept.

## GTFS/GTFS-RT Docs

Documentation on GTFS and GTFS-RT format can read <https://gtfs.org/documentation/overview/>. It takes a bit of time to get familiar with the GTFS format but the documentation is helpful and worth referring to.

You can verify GTFS timetables here <https://gtfs-validator.mobilitydata.org/>.
