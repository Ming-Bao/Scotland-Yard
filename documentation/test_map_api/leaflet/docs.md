The initial version used leaflet routing machine api but this gets overloaded when theres hundreds of nodes.

The next version used geojson to underlay the roads as edges but I have to compute each road segment and it caused issues like some edges rendering with loops in them when zoomed out and some edged will render double in some roads.

