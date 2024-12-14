---
title: Open-Source Phase Retrieval
style: css/custom.css
toc: false
---

```js
const py4dstem_svg = FileAttachment(
  "data/py4dstem-phase-retrieval_updated.svg",
).image();

const img_Ti = FileAttachment("data/mat-sci-examples_Ti.png").href;
const img_hBN = FileAttachment("data/mat-sci-examples_hBN.png").href;
//const img_Au = FileAttachment("data/mat-sci-examples_Au-Carbon.png").href;
const img_cmos = FileAttachment("data/mat-sci-examples_cmos.png").href;
const img_STO_top = FileAttachment("data/mat-sci-examples_STO-top.png").href;
const img_STO_middle = FileAttachment(
  "data/mat-sci-examples_STO-middle.png",
).href;
const img_STO_bottom = FileAttachment(
  "data/mat-sci-examples_STO-bottom.png",
).href;
const img_coreshell_top = FileAttachment(
  "data/mat-sci-examples_core-shell-top.png",
).href;
const img_coreshell_middle = FileAttachment(
  "data/mat-sci-examples_core-shell-middle.png",
).href;
const img_coreshell_bottom = FileAttachment(
  "data/mat-sci-examples_core-shell-bottom.png",
).href;
const img_style = "object-fit:contain;";

const img_VLP = FileAttachment("data/yues-vlps.svg").href;
const img_Apo = FileAttachment("data/berks-apo.svg").href;
const img_TMV = FileAttachment("data/berks-tmv.svg").href;

import { return_resized_img } from "./components/ImageUtilities.js";
```

# Open-Source Phase Retrieval

<div id="py4dstem-container"> ${py4dstem_svg} </div>

- Suite of open-source STEM phase retrieval algorithms:
  - "in-focus" techniques: center-of-mass (COM) imaging and direct ptychography (SSB/WDD)
  - "out-of-focus" techniques: tilt-corrected BF-STEM (parallax) and iterative ptychography
- User-friendly and GPU-accelerated code
  - Check out our tutorial notebooks[^1] and methods paper[^2]
  - Dataset credit[^3]

:::card

```python
ptycho = py4DSTEM.process.phase.SingleslicePtychography(
    datacube=dataset,
    energy = 80e3,
    semiangle_cutoff = 21.4,
    device = 'gpu', # GPU acceleration
    storage = 'cpu', # on-demand data streaming
).preprocess(
    plot_center_of_mass = False,
).reconstruct(
    num_iter = 8,
    step_size = 0.5,
    gaussian_filter_sigma = 0.2, # regularizations
).visualize(
)
```

:::

<style>
  summary h2 {
    display: inline;
  }
</style>

<details>

  <summary>
    <h2> Example Materials-Science Reconstructions </h2>
  </summary>

- Reconstructions of a variety of materials classes[^4]
  - 2D materials as-well as "thick" objects (multislice)
- Reconstructions using a number of different detectors
  - low (4D Camera, K3) / high (EMPAD, Arina) dynamic range
  - even on a CMOS detector!

<div class="grid grid-cols-3" style="grid-auto-rows: auto;">
  <div class="img-container" style="min-height:300px;">
    Ti islands on graphene
    ${resize((width,height)=> return_resized_img(img_Ti,width,height-16,img_style))}
  </div>
  <div class="img-container" style="min-height:300px;">
    few-layer hBN
    ${resize((width,height)=> return_resized_img(img_hBN,width,height-16,img_style))}
  </div>
  <div class="img-container" style="min-height:300px;">
    low-voltage CMOS detector
    ${resize((width,height)=> return_resized_img(img_cmos,width,height-16,img_style))}
  </div>
  <div class="img-container" style="min-height:300px;">
    STO bottom-layer
    ${resize((width,height)=> return_resized_img(img_STO_bottom,width,height-16,img_style))}
  </div>
  <div class="img-container" style="min-height:300px;">
    STO middle-layer
    ${resize((width,height)=> return_resized_img(img_STO_middle,width,height-16,img_style))}
  </div>
  <div class="img-container" style="min-height:300px;">
    STO top-layer
    ${resize((width,height)=> return_resized_img(img_STO_top,width,height-16,img_style))}
  </div>
  <div class="img-container" style="min-height:300px;">
    Core-shell bottom-layer
    ${resize((width,height)=> return_resized_img(img_coreshell_bottom,width,height-16,img_style))}
  </div>
  <div class="img-container" style="min-height:300px;">
    Core-shell middle-layer
    ${resize((width,height)=> return_resized_img(img_coreshell_middle,width,height-16,img_style))}
  </div>
  <div class="img-container" style="min-height:300px;">
    Core-shell top-layer
    ${resize((width,height)=> return_resized_img(img_coreshell_top,width,height-16,img_style))}
  </div>
</div>
</details>

<details>

  <summary>
    <h2> Example Life-Sciences Reconstructions </h2>
  </summary>

- Reconstructions of a variety of dose-sensitive samples[^5]
  - plunge-frozen in vitreous ice &rarr; single-particle analysis

<div class="img-container" style="min-height:300px;">
    Virus-like particles (tilt-corrected BF-STEM)
    ${resize((width, height)=> return_resized_img(img_VLP,width,height-16,img_style))}
</div>

<div class="img-container" style="min-height:330px;">
    Apoferritin proteins (iterative ptychography)
    ${resize((width, height)=> return_resized_img(img_Apo,width,height-16,img_style))}
</div>
  
<div class="img-container" style="min-height:330px;">
    Tobacco mosaic virus (iterative ptychography)
    ${resize((width, height)=> return_resized_img(img_TMV,width,height-16,img_style))}
</div>

</details>

[^1]: https://github.com/py4dstem/py4DSTEM_tutorials/tree/main/notebooks

[^2]: Iterative Phase Retrieval Algorithms for Scanning Transmission Electron Microscopy, [arXiv:2309.05250](https://arxiv.org/abs/2309.05250)

[^3]: 4D-STEM dataset used was recorded by Zhen Chen, at Cornell: [Electron ptychography of 2D materials to deep sub-ångström resolution](https://www.nature.com/articles/s41586-018-0298-5)

[^4]: Materials-science sample & imaging credit: K.Reidy, D. Byrne, F. Allen, B. Cohen, H. Shih, D. Kepaptsoglou, C. Ophus, S. Ribet

[^5]: Life-sciences sample & imaging credit: Y. Yu, K. Küçükoglu, S. Ribet
