---
title: Electron Ptychography
style: css/custom.css
toc: false
---

```js
import * as nj from "npm:numjs";
import {
  corner_crop,
  ComplexNDArray,
  fftfreq,
  fftshift2D,
  meshgrid2D,
  fourier_shift,
  ComplexProbe,
} from "./components/PtychographyHelperFunctions.js";
```

```js
// DPs

const array_buffer_shifted = await FileAttachment(
  "data/FCC-slab-dps-25x25x96x96-float32-shifted.npy",
).arrayBuffer();
const typed_array_shifted = new Float32Array(array_buffer_shifted);
const array_shifted = Array.from(typed_array_shifted);
let dps_shifted = nj.zeros([25, 25, 96, 96]);
dps_shifted.selection.data = array_shifted;

const diffraction_amplitudes_shifted = nj.sqrt(dps_shifted);

const array_buffer = await FileAttachment(
  "data/FCC-slab-dps-25x25x96x96-float32.npy",
).arrayBuffer();
const typed_array = new Float32Array(array_buffer);
const array = Array.from(typed_array);
let dps = nj.zeros([25, 25, 96, 96]);
dps.selection.data = array;

const diffraction_amplitudes = nj.sqrt(dps);
```

```js
// CONSTANTS

const gpts = [96, 96];
const unshuffled_order = d3.range(25 * 25);
```

```js
// PROBE

const real_space_probe = new ComplexProbe(
  gpts,
  [0.255, 0.255],
  80 * 1e3,
  25,
  150,
).build();

const probe_normalization = real_space_probe._array.abs_sqr().max();
```

```js
// PTYCHO FUNCTIONS

function overlap_projection(potential, incoming_probe) {
  let exit_wave = incoming_probe.clone();

  let complex_potential = new ComplexNDArray(potential.shape);
  let cos_phase = nj.cos(potential);
  let sin_phase = nj.sin(potential);
  complex_potential.data = nj.stack([cos_phase, sin_phase], -1);

  exit_wave = exit_wave.multiply(complex_potential);
  return [exit_wave, complex_potential];
}

function fourier_projection(amplitudes, exit_wave) {
  let exit_wave_fourier = new ComplexNDArray(exit_wave.shape);
  exit_wave_fourier.data = nj.fft(exit_wave.data);

  let exit_wave_fourier_angle = exit_wave_fourier.angle();
  let modified_exit_wave_fourier = new ComplexNDArray(exit_wave.shape);
  let cos_phase = nj.cos(exit_wave_fourier_angle);
  let sin_phase = nj.sin(exit_wave_fourier_angle);
  modified_exit_wave_fourier.data = nj.stack([cos_phase, sin_phase], -1);

  modified_exit_wave_fourier =
    modified_exit_wave_fourier.real_multiply(amplitudes);

  let gradient_fourier = modified_exit_wave_fourier.subtract(exit_wave_fourier);
  let gradient = new ComplexNDArray(exit_wave.shape);
  gradient.data = nj.ifft(gradient_fourier.data);

  return gradient;
}

function forward_operator(potential, probe, amplitudes) {
  let [exit_wave, complex_potential] = overlap_projection(potential, probe);
  let gradient = fourier_projection(amplitudes, exit_wave);
  return [exit_wave, complex_potential, gradient];
}

function gradient_descent(potential, [probe_x, probe_y], step_size) {
  let j = probe_x / 4;
  let i = ((gpts[1] - probe_y) % gpts[1]) / 4;

  let amp = diffraction_amplitudes.pick(i, j, null, null);
  let probe = fourier_shift(real_space_probe._array, [-probe_y, -probe_x]);

  let [exit_wave, complex_potential, gradient] = forward_operator(
    potential,
    probe,
    amp,
  );

  let numerator = gradient
    .multiply(complex_potential.conjugate())
    .multiply(probe.conjugate())
    .scalar_multiply(0.0, -1 / probe_normalization);

  let scaled_gradient = potential.add(numerator.re().multiply(step_size));

  return scaled_gradient;
}

function positivity_constraint(potential) {
  return nj.clip(potential, 0.0);
}
```

```js
// MUTABLES

const probe_xy = Mutable([gpts[0] / 2, gpts[1] / 2]);
const set_probe_xy = (val) => (probe_xy.value = val);

const mouse_xy = Mutable(null);
const set_mouse_xy = (val) => (mouse_xy.value = val);

const reconstruct_xy = Mutable([0, 0]);
const set_reconstruct_xy = (val) => (reconstruct_xy.value = val);

const shuffled_order = Mutable(d3.shuffle(unshuffled_order.slice()));
const shuffle_order = () =>
  (shuffled_order.value = d3.shuffle(unshuffled_order.slice()));

const potential = Mutable(nj.zeros(gpts));
const potential_static = Mutable(nj.zeros(gpts));
const set_potential = (val) => (potential.value = val);
const set_potential_static = (val) => (potential_static.value = val);

const iteration_counter = Mutable(0);
const increment_counter = () => ++iteration_counter.value;
const reset_counter = () => (iteration_counter.value = 0);

const previous_potential_reset_value = Mutable(0);
const increment_potential_reset_value = () =>
  ++previous_potential_reset_value.value;
```

```js
// MORE MUTABLES

const gradient_step = Mutable(
  gradient_descent(potential_static, probe_xy, 1.0),
);
const set_gradient_step = (val) => (gradient_step.value = val);
```

```js
const probe_moving = (function () {
  let probe_moving = false;
  if (mouse_xy !== null) {
    if (mouse_xy[0] != probe_xy[0] || mouse_xy[1] != gpts[1] - probe_xy[1]) {
      probe_moving = true;
      set_probe_xy([mouse_xy[0], gpts[1] - mouse_xy[1]]);
    }
  }
  return probe_moving;
})();

const moving_mutable = (function* () {
  if (probe_moving) {
    if (viz_inputs_a.visualization_checkboxes.includes("gradient")) {
      let gr_step = gradient_descent(potential_static, probe_xy, 1.0);
      set_gradient_step(gr_step);

      if (viz_inputs_a.visualization_checkboxes.includes("potential")) {
        if (viz_inputs_b.options.includes("object positivity")) {
          set_potential_static(positivity_constraint(gradient_step));
        } else {
          set_potential_static(gradient_step);
        }
        set_potential(potential_static.clone());
      }
    }
  }
})();
```

```js
const reconstruct_mutable = (function* () {
  if (viz_inputs_b.options.includes("reconstruct")) {
    if (viz_inputs_b.options.includes("random order")) {
      if (iteration_counter % (25 * 25) == 0) {
        shuffle_order();
      }
      let index = shuffled_order[iteration_counter % 625];
      let probe_x = (index % 25) * 4;
      let probe_y = ((index / 25) | 0 % 25) * 4;
      set_reconstruct_xy([probe_x, probe_y]);
    } else {
      let index = unshuffled_order[iteration_counter % 625];
      let probe_x = (index % 25) * 4;
      let probe_y = ((index / 25) | 0 % 25) * 4;
      set_reconstruct_xy([probe_x, probe_y]);
    }
    if (viz_inputs_a.visualization_checkboxes.includes("probe")) {
      set_probe_xy(reconstruct_xy);
    }
    let gr_step = gradient_descent(potential, reconstruct_xy, 1.0);
    if (viz_inputs_b.options.includes("object positivity")) {
      set_potential(positivity_constraint(gr_step));
    } else {
      set_potential(gr_step);
    }
    increment_counter();
  } else if (!probe_moving) {
    set_potential_static(potential.clone());
  }
})();
```

```js
const reset_mutable = (function* () {
  if (
    viz_inputs_a.reset_potential_and_probe_position !=
    previous_potential_reset_value
  ) {
    set_mouse_xy(null);
    set_potential(nj.zeros(gpts));
    set_potential_static(nj.zeros(gpts));
    set_probe_xy([gpts[0] / 2, gpts[1] / 2]);
    set_reconstruct_xy([0, 0]);
    increment_potential_reset_value();
    reset_counter();
  }
})();
```

```js
function return_dp_dictionary(includes_dp) {
  if (includes_dp) {
    let dp_intensity = diffraction_amplitudes_shifted
      .pick(probe_xy[1] / 4, probe_xy[0] / 4, null, null)
      .pow(2);

    return {
      label: "Diffraction Intensity",
      scheme: "Magma",
      domain: [0, 0.00295],
      type: "pow",
      exponent: 0.375,
      width: dp_intensity.shape[1],
      height: dp_intensity.shape[0],
      values: dp_intensity.flatten().tolist(),
    };
  } else {
    return null;
  }
}

const dp_dictionary = return_dp_dictionary(
  viz_inputs_a.visualization_checkboxes.includes("diffraction"),
);
```

```js
function return_probe_dictionary(includes_probe) {
  if (includes_probe) {
    let probe_intensity = fourier_shift(real_space_probe._array, [
      -probe_xy[1],
      -probe_xy[0],
    ]).abs_sqr();

    return {
      label: "Probe Intensity",
      scheme: "magma",
      domain: [0, probe_normalization],
      width: probe_intensity.shape[1],
      height: probe_intensity.shape[0],
      values: probe_intensity.flatten().tolist(),
    };
  } else {
    return null;
  }
}

const probe_dictionary = return_probe_dictionary(
  viz_inputs_a.visualization_checkboxes.includes("probe"),
);
```

```js
function return_potential_dictionary(includes_potential) {
  if (includes_potential) {
    let zero_point = viz_inputs_b.options.includes("object positivity")
      ? 0.0
      : potential.min() * 0.75 - 1e-4;

    let cmap = viz_inputs_b.options.includes("object positivity")
      ? "Magma"
      : "PiYG";

    return {
      label: "Potential",
      scheme: cmap,
      domain: [zero_point, 0.75 * potential.max() + 1e-4],
      width: potential.shape[1],
      height: potential.shape[0],
      values: potential.flatten().tolist(),
    };
  } else {
    return null;
  }
}

const potential_dictionary = return_potential_dictionary(
  viz_inputs_a.visualization_checkboxes.includes("potential"),
);
```

```js
function return_gradient_dictionary(includes_gradient) {
  if (includes_gradient) {
    let gradient_update = gradient_step.subtract(potential_static);

    return {
      label: "Gradient Step",
      scheme: "PuOr",
      domain: [gradient_update.min(), gradient_update.max()],
      width: gradient_update.shape[1],
      height: gradient_update.shape[0],
      values: gradient_update.flatten().tolist(),
    };
  } else {
    return null;
  }
}

const gradient_dictionary = return_gradient_dictionary(
  viz_inputs_a.visualization_checkboxes.includes("gradient"),
);
```

```js
// VISUALIZATIONS

function raster_plot(include, tooltip, dict, width, height) {
  if (include) {
    const plot = Plot.plot({
      width: width,
      height: height,
      margin: 0,
      x: { axis: null },
      y: { axis: null },
      color: {
        label: dict.label,
        domain: dict.domain,
        scheme: dict.scheme,
        type: dict.type,
        exponent: dict.exponent,
        style: { background: "none" },
      },
      style: { background: "none" },
      marks: [
        Plot.raster(dict.values, {
          width: dict.width,
          height: dict.height,
        }),
        Plot.frame({ strokeWidth: 1 }),
      ],
    });

    if (tooltip) {
      d3.select(plot)
        .selectAll("g")
        .on("pointerenter pointermove", (event) => {
          const [px, py] = d3.pointer(event);
          const int_x = ((((px / width) * gpts[0]) / 4) | 0) * 4;
          const int_y = ((((py / height) * gpts[1]) / 4) | 0) * 4;
          set_mouse_xy([int_x, int_y]);
        });
      return plot;
    } else {
      return plot;
    }
  } else {
    return "";
  }
}

function raster_legend(include, dict, width) {
  if (include) {
    return Plot.legend({
      width: width,
      label: dict.label,
      color: {
        domain: dict.domain,
        scheme: dict.scheme,
        type: dict.type,
        exponent: dict.exponent,
        style: { background: "none" },
      },
    });
  } else {
    return "";
  }
}
```

# Iterative Electron Ptychography

- The sample phase can be reconstructed using iterative algorithms:
  - Forward Model &rarr; reconstructed probe and phase accurately reproduce intensities
  - Redundancy &rarr; reconstructed phase is self-consistent with adjacent probe positions

<div class="grid grid-cols-2" style="margin-top: 0; margin-bottom: 0;">
<div class="grid grid-cols-2" style="margin-top: 0; margin-bottom: 0;">
  <div style="max-width: 200px;">
    ${resize((width) => raster_legend(viz_inputs_a.visualization_checkboxes.includes("probe"),probe_dictionary, width))}
    ${resize((width) => raster_plot(viz_inputs_a.visualization_checkboxes.includes("probe"),true,probe_dictionary, width, width))}
  </div>
  <div style="max-width: 200px;">
    ${resize((width) => raster_legend(viz_inputs_a.visualization_checkboxes.includes("potential"),potential_dictionary, width))}
    ${resize((width) => raster_plot(viz_inputs_a.visualization_checkboxes.includes("potential"),true,potential_dictionary, width, width))}
  </div>
</div>
<div class="grid grid-cols-2" style="margin-top: 0; margin-bottom:0;">
  <div style="max-width: 200px;">
    ${resize((width) => raster_legend(viz_inputs_a.visualization_checkboxes.includes("diffraction"),dp_dictionary, width))}
    ${resize((width) => raster_plot(viz_inputs_a.visualization_checkboxes.includes("diffraction"),false,dp_dictionary, width, width))}
  </div>
  <div style="max-width: 200px;">
    ${resize((width) => raster_legend(viz_inputs_a.visualization_checkboxes.includes("gradient"),gradient_dictionary, width))}
    ${resize((width) => raster_plot(viz_inputs_a.visualization_checkboxes.includes("gradient"),false,gradient_dictionary, width, width))}
  </div>
</div>
</div>

```js
// INPUTS

const viz_inputs_a_sliders = Inputs.form({
  visualization_checkboxes: Inputs.checkbox(
    ["probe", "potential", "diffraction", "gradient"],
    {
      value: ["probe", "potential", "diffraction"],
    },
  ),
  reset_potential_and_probe_position: Inputs.button(
    "reset potential and probe position",
  ),
});

const viz_inputs_a = Generators.input(viz_inputs_a_sliders);

const viz_inputs_b_sliders = Inputs.form({
  options: Inputs.checkbox(
    ["reconstruct", "random order", "object positivity"],
    {
      value: ["random order", "object positivity"],
    },
  ),
});

const viz_inputs_b = Generators.input(viz_inputs_b_sliders);
```

<div class="grid grid-cols-2">
  <div> ${viz_inputs_a_sliders}</div>
  <div> ${viz_inputs_b_sliders}</div>
</div>
