# set terminal pngcairo  transparent enhanced font "arial,10" fontscale 1.0 size 600, 400
# set output 'world2.2.png'
set bar 1.000000 front
unset border
set style circle radius graph 0.02, first 0.00000, 0.00000
set style ellipse size graph 0.05, 0.03, first 0.00000 angle 0 units xy
set dummy u, v
set angles degrees
set style textbox transparent margins  1.0,  1.0 border
unset logscale
set parametric
set view 60, 136, 1.22, 1.26
set samples 64, 64
set isosamples 13, 13
set mapping spherical
set hidden3d back offset 0 trianglepattern 3 undefined 1 altdiagonal bentover
set style data lines
unset xtics
unset ytics
unset ztics
unset paxis 1 tics
unset paxis 2 tics
unset paxis 3 tics
unset paxis 4 tics
unset paxis 5 tics
unset paxis 6 tics
unset paxis 7 tics
set title "Labels with hidden line removal"
set urange [ -90.0000 : 90.0000 ] noreverse nowriteback
set vrange [ 0.00000 : 360.000 ] noreverse nowriteback
set cblabel "GeV"
set cbrange [ 0.00000 : 8.00000 ] noreverse nowriteback
set paxis 1 range [ * : * ] noreverse nowriteback
set paxis 2 range [ * : * ] noreverse nowriteback
set paxis 3 range [ * : * ] noreverse nowriteback
set paxis 4 range [ * : * ] noreverse nowriteback
set paxis 5 range [ * : * ] noreverse nowriteback
set paxis 6 range [ * : * ] noreverse nowriteback
set paxis 7 range [ * : * ] noreverse nowriteback
set colorbox user
set colorbox vertical origin screen 0.9, 0.2, 0 size screen 0.02, 0.75, 0 front  noinvert bdefault
u = 0.0
## Last datafile plotted: "srl.dat"
splot cos(u)*cos(v),cos(u)*sin(v),sin(u) notitle with lines lt 5,       'world.dat' notitle with lines lt 2,       'srl.dat' using 3:2:(1):1:4 with labels notitle point pt 6 lw .1 left offset 1,0 font "Helvetica,7" tc pal
