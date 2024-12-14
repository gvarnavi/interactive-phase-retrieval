---
title: Transmission Electron Microscopy
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
  electron_wavelength_angstroms,
  electron_interaction_parameter,
} from "./components/PtychographyHelperFunctions.js";
```

```js
// POTENTIALS

const array_buffer = await FileAttachment(
  "data/FCC-slab-potential-7x244x242-float32.npy",
).arrayBuffer();
const typed_array = new Float32Array(array_buffer);
const array = Array.from(typed_array);
let potential = nj.zeros([7, 244, 242]);
potential.selection.data = array;

const scaling =
  electron_interaction_parameter(viz_inputs_b.energy_keV * 1e3) /
  electron_interaction_parameter(80e3);
potential = potential.multiply(scaling);

const [n_slices, gpts_x, gpts_y] = potential.shape;
let projected_potential = nj.zeros([gpts_x, gpts_y]);
for (let i = 0; i < n_slices; i++) {
  let phase = potential.pick(i, null, null);
  projected_potential = projected_potential.add(phase);
}

let complex_potentials = [...Array(n_slices + 1)].map((d, i) => {
  if (i < n_slices) {
    let complex_potential = new ComplexNDArray([gpts_x, gpts_y]);
    let phase = potential.pick(i, null, null);
    let cos_phase = nj.cos(phase);
    let sin_phase = nj.sin(phase);
    complex_potential.data = nj.stack([cos_phase, sin_phase], -1);
    return complex_potential;
  } else {
    let complex_potential = new ComplexNDArray([gpts_x, gpts_y]);
    let cos_phase = nj.cos(projected_potential);
    let sin_phase = nj.sin(projected_potential);
    complex_potential.data = nj.stack([cos_phase, sin_phase], -1);
    return complex_potential;
  }
});

const potential_dictionary = {
  label: "Projected electrostatic potential",
  domain: [0, Math.PI],
  scheme: "magma",
  width: gpts_y,
  height: gpts_x,
  values: projected_potential.flatten().tolist(),
};
```

```js
// PROBE

const probe_xy = Mutable([gpts_x / 2, gpts_y / 2]);
const set_probe_xy = (val) => (probe_xy.value = val);

const real_space_probe = new ComplexProbe(
  [gpts_x, gpts_y],
  sampling,
  viz_inputs_b.energy_keV * 1e3,
  viz_inputs_b.semiangle,
  viz_inputs_b.defocus,
).build();
```

```js
function return_probe_dictionary(includes_probe) {
  if (includes_probe) {
    let probe_intensity = fourier_shift(real_space_probe._array, [
      probe_xy[1],
      -probe_xy[0],
    ]).abs_sqr();

    return {
      label: "Illuminating probe intensity",
      scheme: "magma",
      domain: [0, real_space_probe._array.abs_sqr().max()],
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
function return_dp_dictionary(includes_dp) {
  if (includes_dp) {
    let dp = diffraction_intensity(
      potential,
      fourier_shift(real_space_probe._array, [probe_xy[1], probe_xy[0]]),
      [gpts_x, gpts_y],
    );
    let dp_intensity = fftshift2D(dp);

    return {
      label: "Diffraction intensities",
      scheme: "Magma",
      domain: [0, 150],
      type: "pow",
      exponent: 0.5,
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
// MULTISLICE

function propagator_array(gpts, sampling, energy, dz) {
  let prefactor = electron_wavelength_angstroms(energy) * Math.PI * dz;

  let kx = fftfreq(gpts[0], sampling[0]);
  let ky = fftfreq(gpts[1], sampling[1]);
  let [KX, KY] = meshgrid2D(kx, ky);

  let chi = nj.add(KX.multiply(KX), KY.multiply(KY)).multiply(prefactor);
  let phase_re = nj.cos(chi);
  let phase_im = nj.sin(chi);

  let propagator = new ComplexNDArray(gpts);
  propagator.data = nj.stack([phase_re, phase_im], -1);

  return propagator;
}

const fixed_dz_propagator = propagator_array(
  [gpts_x, gpts_y],
  sampling,
  viz_inputs_b.energy_keV * 1e3,
  20 / 7,
);

function propagate_wavefunction(array, propagator_array) {
  let array_fourier = new ComplexNDArray(array.shape);
  array_fourier.data = nj.fft(array.data);

  array_fourier.data = nj.ifft(array_fourier.multiply(propagator_array).data);

  return array_fourier;
}

function multislice_propagation(potential, incoming_probe) {
  let [n_slices, nx, ny] = potential.shape;
  let wavefunction = incoming_probe.clone();

  for (let s = 0; s < n_slices; s++) {
    wavefunction = wavefunction.multiply(complex_potentials[s]);
    if (s + 1 < n_slices) {
      wavefunction = propagate_wavefunction(wavefunction, fixed_dz_propagator);
    }
  }

  return wavefunction;
}

function singleslice_propagation(potential, incoming_probe) {
  let wavefunction = incoming_probe.clone();
  wavefunction = wavefunction.multiply(complex_potentials[potential.shape[0]]);
  return wavefunction;
}

function diffraction_intensity(potential, incoming_probe, [sx, sy]) {
  let propagator = use_multislice
    ? multislice_propagation
    : singleslice_propagation;
  let exit_wave = propagator(potential, incoming_probe);
  let exit_wave_fourier = new ComplexNDArray(exit_wave.shape);
  exit_wave_fourier.data = nj.fft(exit_wave.data);
  let exit_wave_cropped = corner_crop(exit_wave_fourier.data, [sx, sy]);
  return exit_wave_cropped.abs_sqr();
}
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
          set_probe_xy([(px / width) * gpts_x, (py / height) * gpts_y]);
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

# Scanning Transmission Electron Microscopy

- Converged electron probe scanned across thin-sample &rarr;
  - acquires phase-shifts due to sample interactions
- Set of diffracted beam _phase-less_ intensities &rarr;
  - collected on far-field pixelated detector ("4D-STEM")

<div class="grid grid-cols-3">
  <div style="max-width:250px;">
    ${resize((width) => raster_legend(viz_inputs_a.visualization_checkboxes.includes("potential"),potential_dictionary, width))}
    ${resize((width) => raster_plot(viz_inputs_a.visualization_checkboxes.includes("potential"),true,potential_dictionary, width, width))}
  </div>
  <div style="max-width:250px;">
    ${resize((width) => raster_legend(viz_inputs_a.visualization_checkboxes.includes("probe"),probe_dictionary, width))}
    ${resize((width) => raster_plot(viz_inputs_a.visualization_checkboxes.includes("probe"),false,probe_dictionary, width, width))}
  </div>
  <div style="max-width:250px;">
    ${resize((width) => raster_legend(viz_inputs_a.visualization_checkboxes.includes("diffraction"),dp_dictionary, width))}
    ${resize((width) => raster_plot(viz_inputs_a.visualization_checkboxes.includes("diffraction"),false,dp_dictionary, width, width))}
  </div>
</div>

```js
// INPUTS
const sampling = [0.1, 0.1];
const use_multislice = false;

const viz_inputs_b = view(
  Inputs.form({
    defocus: Inputs.range([-150, 150], {
      value: 0,
      step: 5,
      label: "defocus, Å",
    }),

    semiangle: Inputs.range([5, 30], {
      value: 25,
      step: 0.5,
      label: "semiangle, mrad",
    }),

    energy_keV: Inputs.range([60, 300], {
      value: 80,
      step: 1,
      label: "energy, kV",
    }),
  }),
);

const viz_inputs_a = view(
  Inputs.form({
    visualization_checkboxes: Inputs.checkbox(
      ["potential", "probe", "diffraction"],
      {
        value: ["potential", "probe", "diffraction"],
      },
    ),
  }),
);
```
