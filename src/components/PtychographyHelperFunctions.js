import * as nj from "npm:numjs";
import { require } from "npm:d3-require";

const ops = await require("https://bundle.run/ndarray-ops@1.2.2");
const cops = await require("https://bundle.run/ndarray-complex@1.0.3");

function atan2(x, y) {
  let res = nj.zeros(x.shape);
  ops.atan2(res.selection, x.selection, y.selection);
  return res;
}

function lt_int_s(x, y) {
  let res = nj.zeros(x.shape);
  ops.lts(res.selection, x.selection, y);
  ops.bandseq(res.selection, 1.0);
  return res;
}

export class ComplexNDArray {
  constructor(shape) {
    this.shape = shape;
    let full_shape = shape.slice();

    full_shape.push(2);
    this.data = nj.zeros(full_shape);
    this._nulls = new Array(shape.length).fill(null);
  }

  re() {
    return this.data.pick(...this._nulls, 0);
  }

  im() {
    return this.data.pick(...this._nulls, 1);
  }

  abs() {
    return nj.sqrt(this.abs_sqr());
  }

  abs_sqr() {
    return nj.add(this.re().multiply(this.re()), this.im().multiply(this.im()));
  }

  angle() {
    return atan2(this.im(), this.re());
  }

  clone() {
    let result = new ComplexNDArray(this.shape);
    result.data = this.data.clone();
    return result;
  }

  conjugate() {
    let a = this.re().clone();
    let b = this.im().clone();
    cops.conjeq(a.selection, b.selection);

    let result = new ComplexNDArray(this.shape);
    result.data = nj.stack([a, b], -1);
    return result;
  }

  multiply(array) {
    let a = this.re().clone();
    let b = this.im().clone();
    let c = array.re();
    let d = array.im();

    cops.muleq(a.selection, b.selection, c.selection, d.selection);

    let result = new ComplexNDArray(this.shape);
    result.data = nj.stack([a, b], -1);
    return result;
  }

  real_multiply(array) {
    let a = this.re().clone();
    let b = this.im().clone();
    let c = array;
    let d = nj.zeros(array.shape);

    cops.muleq(a.selection, b.selection, c.selection, d.selection);

    let result = new ComplexNDArray(this.shape);
    result.data = nj.stack([a, b], -1);
    return result;
  }

  scalar_multiply(c, d) {
    let a = this.re().clone();
    let b = this.im().clone();

    cops.mulseq(a.selection, b.selection, c, d);

    let result = new ComplexNDArray(this.shape);
    result.data = nj.stack([a, b], -1);
    return result;
  }

  add(array) {
    let a = this.re().clone();
    let b = this.im().clone();
    let c = array.re();
    let d = array.im();

    cops.addeq(a.selection, b.selection, c.selection, d.selection);

    let result = new ComplexNDArray(this.shape);
    result.data = nj.stack([a, b], -1);
    return result;
  }

  subtract(array) {
    let a = this.re().clone();
    let b = this.im().clone();
    let c = array.re();
    let d = array.im();

    cops.subeq(a.selection, b.selection, c.selection, d.selection);

    let result = new ComplexNDArray(this.shape);
    result.data = nj.stack([a, b], -1);
    return result;
  }
}

export function fftfreq(n, d) {
  let freqs = nj.zeros(n);
  let val = 1.0 / (n * d);
  let N = (((n - 1) / 2) | 0) + 1;
  for (var i = 0; i < N; i++) freqs.set(i, i * val);
  let N2 = (n / 2) | 0;
  for (var i = N; i < n; i++) freqs.set(i, (i - n) * val);
  return freqs;
}

export function meshgrid2D(xvals, yvals) {
  let shape = [xvals.size, yvals.size];
  let ret = [];
  ret[0] = nj.zeros(shape);
  ret[1] = nj.zeros(shape);
  for (let iy = 0; iy < shape[1]; iy++) {
    for (let ix = 0; ix < shape[0]; ix++) {
      ret[0].set(ix, iy, xvals.get(ix));
      ret[1].set(ix, iy, yvals.get(iy));
    }
  }
  return ret;
}

export function fftshift2D(ndarray) {
  // currently only works for even dimensions and is v. slow

  let [nx, ny] = ndarray.shape;
  let i = (nx / 2) | 0;
  let j = (ny / 2) | 0;

  let res = nj.zeros([nx, ny]);

  // top-left
  res.slice([null, i], [null, j]).assign(ndarray.slice(-i, -j), false);

  // top-right
  res.slice([null, i], j).assign(ndarray.slice(-i, [null, j]), false);

  // bottom-right
  res.slice(-i, -j).assign(ndarray.slice([null, i], [null, j]), false);

  // bottom-left
  res.slice(-i, [null, j]).assign(ndarray.slice([null, i], -j), false);

  return res;
}

export function fourier_shift(array, shift) {
  let [nx, ny] = array.shape;
  let [dx, dy] = shift;

  let array_fourier = new ComplexNDArray([nx, ny]);
  array_fourier.data = nj.fft(array.data);

  let kx = fftfreq(nx, 1);
  let ky = fftfreq(ny, 1);
  let [KX, KY] = meshgrid2D(kx, ky);

  let prefactor = -2 * Math.PI;
  let trig_argument = nj
    .add(KX.multiply(dx), KY.multiply(dy))
    .multiply(prefactor);

  let shift_fourier = new ComplexNDArray([nx, ny]);
  let shift_real = nj.cos(trig_argument);
  let shift_imag = nj.sin(trig_argument);
  shift_fourier.data = nj.stack([shift_real, shift_imag], -1);

  let array_fourier_shifted = array_fourier.multiply(shift_fourier);
  array_fourier_shifted.data = nj.ifft(array_fourier_shifted.data);

  return array_fourier_shifted;
}

export function corner_crop(array, [sx, sy]) {
  let array_cropped = new ComplexNDArray([sx, sy]);
  let i = (sx / 2) | 0;
  let j = (sy / 2) | 0;

  array_cropped.data
    .slice([null, i], [null, j], null)
    .assign(array.slice([null, i], [null, j], null), false);

  array_cropped.data
    .slice(-i, [null, j], null)
    .assign(array.slice(-i, [null, j], null), false);

  array_cropped.data
    .slice([null, i], -j, null)
    .assign(array.slice([null, i], -j, null), false);

  array_cropped.data
    .slice(-i, -j, null)
    .assign(array.slice(-i, -j, null), false);

  return array_cropped;
}

export function electron_wavelength_angstroms(energy) {
  let m = 9.109383 * 10e-31;
  let e = 1.602177 * 10e-19;
  let c = 299792458;
  let h = 6.62607e-34;
  return (
    (h /
      Math.sqrt(2 * m * e * energy) /
      Math.sqrt(1 + (e * energy) / 2 / m / c / c)) *
    10e10
  );
}

export function electron_interaction_parameter(energy) {
  let m = 9.109383 * 10e-31;
  let e = 1.602177 * 10e-19;
  let c = 299792458;
  let h = 6.62607e-34;
  let lam = electron_wavelength_angstroms(energy);
  return (
    (((2 * Math.PI) / lam / energy) * (m * c * c + e * energy)) /
    (2 * m * c * c + e * energy)
  );
}

export class ComplexProbe {
  constructor(
    gpts,
    sampling,
    energy,
    semiangle_cutoff,
    defocus,
    stig = 0,
    stig_angle = Math.PI / 2,
  ) {
    this._gpts = gpts.slice();
    this._sampling = sampling.slice();
    this._energy = energy;
    this._wavelength = electron_wavelength_angstroms(energy);
    this._semiangle_cutoff = semiangle_cutoff;
    this._defocus = defocus;
    this._stig = stig;
    this._stig_angle = stig_angle;
  }

  _get_scattering_angles() {
    let kx = fftfreq(this._gpts[0], this._sampling[0]);
    let ky = fftfreq(this._gpts[1], this._sampling[1]);

    let [KX, KY] = meshgrid2D(kx, ky);
    let alpha = nj.sqrt(
      nj.add(
        KX.multiply(KX.multiply(this._wavelength * this._wavelength)),
        KY.multiply(KY.multiply(this._wavelength * this._wavelength)),
      ),
    );
    let phi = atan2(KY, KX);
    return [alpha, phi];
  }

  _evaluate_aberrations(alpha, phi) {
    let prefactor = Math.PI / this._wavelength;

    let defocus_plus_stig = nj
      .cos(phi.subtract(this._stig_angle).multiply(2))
      .multiply(this._stig)
      .add(this._defocus);

    let chi = alpha
      .multiply(alpha)
      .multiply(defocus_plus_stig)
      .multiply(prefactor);

    let cos_chi = nj.cos(chi);
    let sin_chi = nj.sin(chi);

    let aberrations = new ComplexNDArray(chi.shape);
    aberrations.data = nj.stack([cos_chi, sin_chi], -1);

    return aberrations;
  }

  _evaluate_aperture(alpha, phi) {
    let semiangle_cutoff = this._semiangle_cutoff / 1000;

    let aperture = new ComplexNDArray(alpha.shape);
    let aperture_re = lt_int_s(alpha, semiangle_cutoff);
    aperture.data = nj.stack([aperture_re, nj.zeros(alpha.shape)], -1);

    return aperture;
  }

  build() {
    let [alpha, phi] = this._get_scattering_angles();
    let aberrations = this._evaluate_aberrations(alpha, phi);
    let aperture = this._evaluate_aperture(alpha, phi);
    let probe_fourier_array = aberrations.multiply(aperture);

    let probe_array = new ComplexNDArray(probe_fourier_array.shape);
    probe_array.data = nj.ifft(probe_fourier_array.data);
    let probe_array_sum = Math.sqrt(probe_array.abs_sqr().sum());

    this._array = probe_array.scalar_multiply(1 / probe_array_sum, 0.0);
    this._fourier_array = probe_fourier_array;
    this._aberrations = aberrations;
    this._aperture = aperture;

    return this;
  }
}
