# How to make travel time isochrones

You need a an `osm.pbf` file for the area in question. A good place to look is the [geofabrik website](https://download.geofabrik.de/). You can trim it by creating a bounding box on <https://boundingbox.klokantech.com/> (choose the csv option to get the coordinates) and then using [Osmium Tool](https://osmcode.org/osmium-tool/).

You also need a GTFS timetable file.

Ensure these are in your `data_path` which you will set in `make_isochrones.R`.
