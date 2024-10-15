# setwd("/Users/lukestrange/Code/bus-tracking/R")
# Increase memory
options(java.parameters = "-Xmx8G")

# Check if 'r5r' is installed, and install it if not
# if (!requireNamespace("r5r", quietly = TRUE)) {
#   remotes::install_github("ipeaGIT/r5r")
# }
library(r5r)
library(sf)
library(ggplot2)

# data_path <- system.file("/Users/lukestrange/Code/bus-tracking/R/data", package = 'r5r')
# print(list.files(data_path))

# # Indicate the path where OSM and GTFS data are stored
r5r_core <- setup_r5(data_path = "/Users/lukestrange/Code/bus-tracking/R/yorkshire/real")

origin <- data.frame(id='origin1', lon=-1.54702, lat=53.79955)

departure_datetime <- as.POSIXct(
  "15-09-2024 17:00:00",
  format = "%d-%m-%Y %H:%M:%S"
)

iso1 <- isochrone(r5r_core, 
                  origins = origin, 
                  mode="TRANSIT", 
                  mode_egress="WALK",
                  max_walk_time=5, 
                  departure_datetime = departure_datetime, 
                  cutoffs = c(0, 2700))

colour <- c('#ffe0a5', '#003f5c')

# Save as GeoJSON
st_write(iso1['isochrone'], "150924_1700.geojson", driver = "GeoJSON")

stop_r5(r5r_core)