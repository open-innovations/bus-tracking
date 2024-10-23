
# Increase memory
options(java.parameters = "-Xmx4G")

library(r5r)
library(sf)
 
region <- "north_west"
date <- "20240920"
time <- "17:00:00"
type <- "real"
formatted_date <- format(as.Date(date, "%Y%m%d"), "%d-%m-%Y")

# Indicate the path where OSM and GTFS data are stored

r5r_core <- setup_r5(data_path = sprintf("/Users/lukestrange/Code/bus-tracking/R/%s/%s", region, type))

origin <- data.frame(id='origin1', lon=-2.981029, lat=53.40592)

departure_datetime <- as.POSIXct(
  sprintf("%s %s", formatted_date, time),
  format = "%d-%m-%Y %H:%M:%S"
)
# Docs here: https://ipeagit.github.io/r5r/reference/isochrone.html 
iso1 <- isochrone(r5r_core, 
                  origins = origin, 
                  mode="TRANSIT", 
                  mode_egress="WALK",
                  max_walk_time=5, 
                  departure_datetime = departure_datetime, 
                  cutoffs = c(0, 2700)
                  )

# Save as GeoJSON
st_write(iso1['isochrone'], sprintf("data/geojson/%s/%s_%s_%s.geojson", type, region, date, time), driver = "GeoJSON")

stop_r5(r5r_core)
