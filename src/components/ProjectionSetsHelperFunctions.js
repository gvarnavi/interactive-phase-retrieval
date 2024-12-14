import * as nj from "npm:numjs";

function return_flower_values() {
  const theta = nj.arange(0, 2 * Math.PI, Math.PI / 512);
  const origin = [
    (-5 / 4) * Math.cos(Math.PI / 8),
    (-5 / 4) * Math.sin(Math.PI / 8),
  ];

  const radius = nj.sin(theta.multiply(4)).divide(4).add(1);
  const x_values = radius.multiply(nj.cos(theta)).subtract(origin[0]).divide(3);
  const y_values = radius.multiply(nj.sin(theta)).subtract(origin[1]).divide(3);

  return nj.stack([x_values, y_values], -1);
}

const flower_values = return_flower_values();

export function region_nearest_convex_red([x, y]) {
  return [(2 / 5) * (2 * x + y), (2 * x + y) / 5];
}

export function region_nearest_convex_blue([x, y]) {
  return [(32 / 65) * (2 * x + y / 4), (4 / 65) * (2 * x + y / 4)];
}

export function region_nearest_nonconvex_red([x, y]) {
  if (8 * x + 4 * y >= 5 || 2 * x + y <= 5 / 8) {
    let common = (2 * x + y) / 5;
    return [common * 2, common];
  } else if (15 / 16 < 2 * x + y && 2 * x + y < 5 / 4) {
    return [1 / 2, 1 / 4];
  } else if (2 * x + y > 5 / 8) {
    return [1 / 4, 1 / 8];
  } else {
    let common = (2 * y) / 5 + (4 * x) / 5 - 1 / 8;
    return [common * 2, common];
  }
}

export function region_nearest_nonconvex_blue([x, y]) {
  if (8 * x + y >= 65 / 16 || 8 * x + y <= 65 / 32) {
    let common = (8 * x + y) / 65;
    return [common * 8, common];
  } else if (195 / 64 < 8 * x + y && x + y < 65 / 16) {
    return [1 / 2, 1 / 16];
  } else if (8 * x + y >= 65 / 32) {
    return [1 / 4, 1 / 32];
  } else {
    let common = (2 * y) / 65 + (16 * x) / 64 - 1 / 32;
    return [common * 8, common];
  }
}

export function region_nearest_flower_green([x, y]) {
  // brute-force it
  let squared_distances = nj
    .add(
      flower_values.pick(null, 0).subtract(x).pow(2),
      flower_values.pick(null, 1).subtract(y).pow(2),
    )
    .tolist();

  let min_index = squared_distances.reduce(
    (r, v, i, a) => (v > a[r] ? r : i),
    -1,
  );
  return [flower_values.get(min_index, 0), flower_values.get(min_index, 1)];
}

export function generalized_projection(fa, fb, [a, b, c]) {
  let projection_x = 1 - a - b;
  let projection_y = 1 - c;
  return function ([x, y]) {
    let [pa_x, pa_y] = fa([x, y]);
    let [pb_x, pb_y] = fb([
      c * pa_x + projection_y * x,
      c * pa_y + projection_y * y,
    ]);
    return [
      [pa_x, pa_y],
      [pb_x, pb_y],
      [
        projection_x * x + a * pa_x + b * pb_x,
        projection_x * y + a * pa_y + b * pb_y,
      ],
    ];
  };
}

function product_space_projection(fa, fb, fc) {
  return function ([[ax, ay], [bx, by], [cx, cy]]) {
    return [fa([ax, ay]), fb([bx, by]), fc([cx, cy])];
  };
}

function diagonal_projection([[ax, ay], [bx, by], [cx, cy]]) {
  let x = (ax + bx + cx) / 3;
  let y = (ay + by + cy) / 3;
  return [
    [x, y],
    [x, y],
    [x, y],
  ];
}

export function generalized_projection_multiple(fa, fb, fc, [a, b, c]) {
  let projection_x = 1 - a - b;
  let projection_y = 1 - c;
  let product = product_space_projection(fa, fb, fc);
  let diagonal = diagonal_projection;

  return function ([[ax, ay], [bx, by], [cx, cy]]) {
    let [[pa_x, pa_y], [pb_x, pb_y], [pc_x, pc_y]] = product([
      [ax, ay],
      [bx, by],
      [cx, cy],
    ]);
    let [[da_x, da_y], [db_x, db_y], [dc_x, dc_y]] = diagonal([
      [c * pa_x + projection_y * ax, c * pa_y + projection_y * ay],
      [c * pb_x + projection_y * bx, c * pb_y + projection_y * by],
      [c * pc_x + projection_y * cx, c * pc_y + projection_y * cy],
    ]);
    return [
      [
        projection_x * ax + a * pa_x + b * da_x,
        projection_x * ay + a * pa_y + b * da_y,
      ],
      [
        projection_x * bx + a * pb_x + b * db_x,
        projection_x * by + a * pb_y + b * db_y,
      ],
      [
        projection_x * cx + a * pc_x + b * dc_x,
        projection_x * cy + a * pc_y + b * dc_y,
      ],
    ];
  };
}
