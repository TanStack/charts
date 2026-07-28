# AG Charts SSR, accessibility, and export notes

**Retrieved**: 2026-07-26  
**Sources**:

- https://www.ag-grid.com/charts/react/server-side-rendering/
- https://www.ag-grid.com/charts/react/accessibility/
- https://www.ag-grid.com/charts/javascript/api-download/
- https://www.ag-grid.com/charts/javascript/layout/

## Server-side rendering

- `ag-charts-server-side` renders PNG or JPEG buffers in Node 20+.
- It reuses browser chart options but requires explicit width and height.
- Standard, gauge, and financial charts have server entry points.
- Custom fonts can be loaded from local files.
- Server-side rendering is Enterprise.

This is server-side raster generation. It is not equivalent to rendering live
chart markup into an application response and hydrating it into an interactive
client chart.

## Browser export

- A chart instance can trigger an image download.
- It can return a base64 image data URL.
- The documented browser output is raster, consistent with the Canvas renderer.

## Accessibility

- Keyboard navigation is on by default.
- Users can traverse series, data points, legends, navigator, toolbars, and
  buttons.
- Page and home/end keys support large series.
- Focused elements generate screen-reader announcements.
- AG documents tests with NVDA, JAWS, Windows Narrator, and VoiceOver.
- The site positions the implementation against WCAG 2.0 AA, ADA, and Section 508.

## Responsive layout

- Charts observe the container and recalculate layout on size changes.
- The default minimum browser size is 300×300 unless overridden.
- Layout accounts for captions, legend, toolbar, range buttons, navigator, and
  series area.
