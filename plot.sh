#!/bin/bash
set -e

read LON LAT SATNAME

cat > data.txt

gnuplot <<EOF | tee "plot.png" | imgcat
set terminal png
set title "$SATNAME"
set xlabel "Longitude"
set ylabel "Latitude"
horizon_diameter = 20
plotsize_radius = horizon_diameter * 0.6
set xrange [$LON - plotsize_radius:$LON + plotsize_radius]
set yrange [$LAT - plotsize_radius:$LAT + plotsize_radius]
set object 10 ellipse center $LON,$LAT size horizon_diameter,horizon_diameter units xy
set object 11 ellipse center $LON,$LAT size 0.25,0.25 units xy
datafile = 'data.txt'
stats datafile using 2:3 nooutput
plot for [i = 0:STATS_blocks - 1] \
  datafile index i using 2:3 with linespoints title columnheader(1), \
  for [i = 0:STATS_blocks - 1] '' index i using 2:3:1 every 2 with labels offset 0.5,0.5 font "Arial,8" notitle
EOF

# datafile index IDX using 2:3:1 every 2 with labels offset 5,0.5 font "Arial,8" notitle,\
# '' index IDX using 2:3 with linespoints title '$SATNAME'
