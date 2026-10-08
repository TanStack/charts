# Post-1.0 bundle changes

Baseline: `d7ca749e`, whose public runtime output also matches `8d9fe649`.
Final: the runtime changes committed with this report. Node 24.18.0,
pnpm 11.15.1, esbuild 0.27.7, minified production ESM, ES2022, tree shaking.
All values are decimal kB. Only changed consumers are listed. Removed research
entries were not restored. The user approved these increases on October 8;
affected limits and exact baselines now include the measured changes.

| Consumer                                    | Baseline gzip | Final gzip | Gzip change | Minified change |
| ------------------------------------------- | ------------: | ---------: | ----------: | --------------: |
| charts-area-x-svg.js                        |        26.273 |     26.295 |       0.022 |           0.071 |
| charts-arrow-svg.js                         |        22.136 |     22.154 |       0.018 |           0.074 |
| charts-axis-label-styles.js                 |        22.311 |     22.332 |       0.021 |           0.070 |
| charts-box-svg.js                           |        32.213 |     32.235 |       0.022 |           0.070 |
| charts-brush-x.js                           |        49.163 |     49.693 |       0.530 |           1.157 |
| charts-canvas.js                            |        30.077 |     30.286 |       0.209 |           0.419 |
| charts-compact-linear-scene.js              |        12.781 |     12.797 |       0.016 |           0.068 |
| charts-composite-mark.js                    |        31.175 |     31.199 |       0.024 |           0.070 |
| charts-continuous-cursor.js                 |        32.784 |     33.010 |       0.226 |           0.513 |
| charts-core.js                              |        19.935 |     19.966 |       0.031 |           0.069 |
| charts-custom-scale-scene.js                |        12.045 |     12.064 |       0.019 |           0.070 |
| charts-d3-curve-svg.js                      |        24.556 |     24.582 |       0.026 |           0.074 |
| charts-d3-curved-line-scene.js              |        22.235 |     22.262 |       0.027 |           0.072 |
| charts-d3-delaunay-dom.js                   |        46.004 |     46.215 |       0.211 |           0.420 |
| charts-d3-linear-scene.js                   |        19.898 |     19.928 |       0.030 |           0.069 |
| charts-d3-quadtree-dom.js                   |        40.590 |     40.804 |       0.214 |           0.419 |
| charts-d3-time-scene.js                     |        24.581 |     24.602 |       0.021 |           0.077 |
| charts-d3-time-svg.js                       |        26.890 |     26.924 |       0.034 |           0.077 |
| charts-d3-transform-histogram.js            |        23.568 |     23.593 |       0.025 |           0.070 |
| charts-decorative-line-svg.js               |        22.865 |     22.896 |       0.031 |           0.070 |
| charts-difference-svg.js                    |        29.374 |     29.401 |       0.027 |           0.070 |
| charts-dodge-svg.js                         |        23.123 |     23.339 |       0.216 |           0.507 |
| charts-dom.js                               |        28.902 |     29.116 |       0.214 |           0.420 |
| charts-dot-svg.js                           |        22.568 |     22.584 |       0.016 |           0.076 |
| charts-facet-svg.js                         |        26.114 |     26.135 |       0.021 |           0.069 |
| charts-focus-guide.js                       |        23.867 |     23.892 |       0.025 |           0.071 |
| charts-frame-svg.js                         |        13.298 |     13.323 |       0.025 |           0.073 |
| charts-geo-svg.js                           |        19.440 |     19.460 |       0.020 |           0.069 |
| charts-hexagon-svg.js                       |        22.050 |     22.066 |       0.016 |           0.071 |
| charts-histogram-svg.js                     |        24.858 |     24.884 |       0.026 |           0.070 |
| charts-interactive-legend.js                |        31.831 |     32.043 |       0.212 |           0.418 |
| charts-line-x-svg.js                        |        22.179 |     22.196 |       0.017 |           0.070 |
| charts-link-svg.js                          |        22.021 |     22.042 |       0.021 |           0.074 |
| charts-polar-arc-svg.js                     |        18.453 |     18.466 |       0.013 |           0.070 |
| charts-polar-gauge-svg.js                   |        27.859 |     27.872 |       0.013 |           0.071 |
| charts-polar-line-scatter-svg.js            |        28.810 |     28.825 |       0.015 |           0.071 |
| charts-polar-pie-svg.js                     |        19.491 |     19.519 |       0.028 |           0.070 |
| charts-radial-bar-svg.js                    |        27.750 |     27.773 |       0.023 |           0.070 |
| charts-radial-label-svg.js                  |        24.280 |     24.312 |       0.032 |           0.072 |
| charts-react-canvas.js                      |        30.923 |     31.142 |       0.219 |           0.421 |
| charts-react-compact-line-tooltip-portal.js |        37.100 |     37.391 |       0.291 |           0.622 |
| charts-react-compact-line-tooltip.js        |        36.265 |     36.559 |       0.294 |           0.620 |
| charts-react-compact-line.js                |        32.091 |     32.305 |       0.214 |           0.419 |
| charts-react-core.js                        |        21.124 |     21.334 |       0.210 |           0.423 |
| charts-react-line-mark-canvas.js            |        46.427 |     46.641 |       0.214 |           0.417 |
| charts-react-line.js                        |        39.215 |     39.420 |       0.205 |           0.419 |
| charts-react-native-line.js                 |        31.385 |     31.411 |       0.026 |           0.070 |
| charts-react-native-tooltip.js              |        24.878 |     24.887 |       0.009 |           0.068 |
| charts-react-native-universal-boundary.js   |        23.832 |     23.865 |       0.033 |           0.070 |
| charts-react-native.js                      |        22.106 |     22.139 |       0.033 |           0.070 |
| charts-react-stats-parity-tsx.js            |        59.511 |     59.863 |       0.352 |           0.624 |
| charts-react.js                             |        29.851 |     30.070 |       0.219 |           0.419 |
| charts-regression-svg.js                    |        28.959 |     28.986 |       0.027 |           0.067 |
| charts-renderer.js                          |        20.305 |     20.493 |       0.188 |           0.421 |
| charts-representative-mark-canvas.js        |        40.268 |     40.294 |       0.026 |           0.070 |
| charts-representative.js                    |        30.397 |     30.414 |       0.017 |           0.070 |
| charts-ridgeline-svg.js                     |        22.936 |     22.961 |       0.025 |           0.071 |
| charts-scale-handle.js                      |        32.674 |     32.948 |       0.274 |           0.513 |
| charts-selected-overlay-svg.js              |        24.246 |     24.273 |       0.027 |           0.076 |
| charts-spatial-contour-svg.js               |        16.157 |     16.182 |       0.025 |           0.071 |
| charts-spatial-delaunay-svg.js              |        30.369 |     30.391 |       0.022 |           0.075 |
| charts-spatial-density-svg.js               |        25.507 |     25.537 |       0.030 |           0.074 |
| charts-spatial-hexbin-svg.js                |        23.684 |     23.702 |       0.018 |           0.074 |
| charts-spatial-voronoi-svg.js               |        31.684 |     31.716 |       0.032 |           0.075 |
| charts-stats-parity.js                      |        58.472 |     58.750 |       0.278 |           0.624 |
| charts-svg.js                               |        22.256 |     22.278 |       0.022 |           0.070 |
| charts-tick-label-accessors.js              |        22.356 |     22.378 |       0.022 |           0.070 |
| charts-tick-svg.js                          |        23.013 |     23.032 |       0.019 |           0.074 |
| charts-time-svg.js                          |        26.890 |     26.924 |       0.034 |           0.077 |
| charts-tooltip-kernel.js                    |         4.620 |      4.699 |       0.079 |           0.202 |
| charts-vector-svg.js                        |        22.218 |     22.242 |       0.024 |           0.071 |
| charts-view-composition.js                  |        28.037 |     28.058 |       0.021 |           0.070 |
| charts-violin-svg.js                        |        22.888 |     22.905 |       0.017 |           0.072 |
| charts-waffle-svg.js                        |        14.914 |     14.942 |       0.028 |           0.069 |
| charts-zoom-x.js                            |        49.878 |     50.140 |       0.262 |           0.503 |
