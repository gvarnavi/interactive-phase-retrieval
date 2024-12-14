import { html } from "npm:htl";

export function return_resized_img(src, width, height = width, style = "") {
  return html` <img
    src="${src}"
    width="${width}px"
    height="${height}px"
    style="${style}"
  />`;
}
