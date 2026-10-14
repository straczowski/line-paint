# Line Paint

Draw lines in the browser, export as GCode send them to a pen plotter.

**[Open the demo](https://straczowski.github.io/line-paint/)**

The sheet is A4 landscape, in millimeters. Click to place a point, press Enter to finish the line, then move, scale, or rotate what you drew. Export SVG or GCode when the drawing is ready for paper.

A push to `main` publishes that demo.

Pictures become lines in [line-weaver](https://github.com/straczowski/line-weaver/). You can import as SVG from here. This app is for drawing and editing.

## On your machine

```bash
npm install
npm run dev
```

Open http://localhost:5173/line-paint/.
