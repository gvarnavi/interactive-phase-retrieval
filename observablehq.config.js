import MarkdownItContainer from "markdown-it-container";
import MarkdownItFootnote from "markdown-it-footnote";

const head = `
<link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16x16.png">
<link rel="manifest" href="/assets/site.webmanifest">
`;

export default {
  // The app’s title; used in the sidebar and webpage titles.
  title: "Interactive Phase Retrieval",
  head: head,
  root: "src",
  theme: "dark",
  typographer: true,
  markdownIt: (md) =>
    md
      .use(MarkdownItContainer, "card") // ::: card
      .use(MarkdownItContainer, "hero") // ::: hero
      .use(MarkdownItFootnote), // [^1] or [^longnote],
  pages: [
    { name: "Transmission Electron Microscopy", path: "stem-measurements" },
    { name: "Iterative Electron Ptychography", path: "electron-ptychography" },
    { name: "Imaging Weakly-Scattering Objects", path: "phase-problem" },
    {
      name: "Open-Source Phase Retrieval",
      path: "open-source-phase-retrieval",
    },
    { name: "About This Presentation", path: "about" },
  ],
  // Some additional configuration options and their defaults:
  // theme: "default", // try "light", "dark", "slate", etc.
  // header: "", // what to show in the header (HTML)
  // footer: "Built with Observable.", // what to show in the footer (HTML)
  // sidebar: true, // whether to show the sidebar
  // toc: true, // whether to show the table of contents
  // pager: true, // whether to show previous & next links in the footer
  // output: "dist", // path to the output root for build
  // search: true, // activate search
  // linkify: true, // convert URLs in Markdown to links
  // typographer: false, // smart quotes and other typographic improvements
  // preserveExtension: false, // drop .html from URLs
  // preserveIndex: false, // drop /index from URLs
};
