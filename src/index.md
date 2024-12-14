---
toc: false
style: css/index.css
---

:::hero

# Interactive Phase Retrieval

:::

```js
import * as nj from "npm:numjs";
import {
  region_nearest_nonconvex_red,
  region_nearest_nonconvex_blue,
  generalized_projection,
} from "./components/ProjectionSetsHelperFunctions.js";
```

```js
// PROJECTION FUNCTIONS
const projection_parameters = {
  "alternating projections": [0, 1, 1],
  "difference map": [-1, 1, 2],
  "relaxed avg. alt. reflections": [-0.75, 0.875, 2],
};

const two_nonconvex_sets = generalized_projection(
  region_nearest_nonconvex_red,
  region_nearest_nonconvex_blue,
  projection_parameters[radio],
);
```

```js
// MUTABLE VALUES

const default_values = [
  [
    [1, 0.3],
    [1, 0.3],
    [1, 0.3],
  ],
];

const iteration_pts_nonconvex = Mutable(default_values);

const append_nonconvex_pts = (val) =>
  (iteration_pts_nonconvex.value = [...iteration_pts_nonconvex.value, val]);

const reset_nonconvex_pts = () =>
  (iteration_pts_nonconvex.value = default_values);
```

```js
// VISUALIZATION

const non_convex_lines = [
  { x: -1 / 2, y: -1 / 4, set: 1, col: "#F994FF" },
  { x: 1 / 4, y: 1 / 8, set: 1, col: "#F994FF" },
  { x: 1 / 2, y: 1 / 4, set: 2, col: "#F994FF" },
  { x: 9 / 8, y: 9 / 16, set: 2, col: "#F994FF" },

  { x: -1 / 2, y: -1 / 16, set: 3, col: "#94FFF9" },
  { x: 1 / 4, y: 1 / 32, set: 3, col: "#94FFF9" },
  { x: 1 / 2, y: 1 / 16, set: 4, col: "#94FFF9" },
  { x: 9 / 8, y: 9 / 64, set: 4, col: "#94FFF9" },
];

const trace = iteration_pts_nonconvex.map((d) => d[2]);
const viz = Plot.plot({
  x: { axis: false, domain: [-1 / 2, 9 / 8] },
  y: { axis: false, domain: [-1 / 4, 1 / 2] },
  aspectRatio: 1,
  style: { background: "none" },
  width: 500,
  marks: [
    Plot.line(non_convex_lines, { x: "x", y: "y", z: "set", stroke: "col" }),
    Plot.line(trace, { stroke: "#FED9AC" }),
    Plot.dot(trace, {
      fill: "#FED9AC",
      fillOpacity: 0.5,
      r: 10,
    }),
  ],
});
```

```js

```

```js
const buttons_input = Inputs.button(
  [
    ["iterate", (value) => 1],
    ["stop", (value) => 0],
    ["reset", (value) => -1],
  ],
  { value: 0 },
);

const button = Generators.input(buttons_input);

const radio_input = Inputs.radio(
  [
    "alternating projections",
    "difference map",
    "relaxed avg. alt. reflections",
  ],
  { value: "alternating projections" },
);

const radio = Generators.input(radio_input);
```

```js
// ITERATE

const j = (async function* () {
  if (button > 0) {
    for (let j = 0; true; ++j) {
      yield j;
      await new Promise((resolve) => setTimeout(resolve, 200));
      let l = iteration_pts_nonconvex.length;
      append_nonconvex_pts(
        two_nonconvex_sets(iteration_pts_nonconvex[l - 1][2]),
      );
    }
  }
})();
```

```js
{
  if (button < 0) {
    reset_nonconvex_pts();
  }
}
```

<div style="margin: 0 auto; width: 500px;">
  ${radio_input}
  ${buttons_input}
  ${viz}
</div>

:::hero

> Dr. Georgios Varnavides | UCB, LBNL  
> https://gvarnavides.com/interactive-phase-retrieval

:::
