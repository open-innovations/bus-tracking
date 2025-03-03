import lume from "lume/mod.ts";
import base_path from "lume/plugins/base_path.ts";
import date from "lume/plugins/date.ts";
import favicon from "lume/plugins/favicon.ts";
import json from "lume/core/loaders/json.ts";
import metas from "lume/plugins/metas.ts";
import nav from "lume/plugins/nav.ts";
import postcss from "lume/plugins/postcss.ts";

// Importing the OI Lume charts and utilities
import oiViz from "https://deno.land/x/oi_lume_viz@v0.16.9/mod.ts";
import autoDependency from "https://deno.land/x/oi_lume_utils@v0.4.0/processors/auto-dependency.ts";
import csvLoader from "https://deno.land/x/oi_lume_utils@v0.4.0/loaders/csv-loader.ts";

const site = lume({
    src: './src',
    location: new URL("https://dev.open-innovations.org/lcrca-bus-tracking/")
});

site.process([".html"], (pages) => pages.forEach(autoDependency));

site.use(base_path());
site.use(date());

// site.use(metas({
//     defaultPageData: {
//       title: 'title', // Use the `date` value as fallback.
//     },
//   }));

site.use(nav());
site.use(postcss());

// Import lume viz
import oiVizConfig from "./oi-viz-config.ts";
site.use(oiViz(oiVizConfig));

// Load specified data files
site.loadData([".hexjson", ".json", ".geojson"], json);
site.loadData([".csv"], csvLoader({ basic: true }));

// site.copy('.nojekyll');
site.copy('/assets/vendor/');


export default site;
