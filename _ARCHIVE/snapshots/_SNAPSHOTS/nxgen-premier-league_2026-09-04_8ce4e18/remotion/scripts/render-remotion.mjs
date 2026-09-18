import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
  openBrowser,
} from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

const browser = await openBrowser("chrome", {
  browserExecutable:
    process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: {
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: "main",
  puppeteerInstance: browser,
});

const stillFrame = process.env.STILL_FRAME;

if (stillFrame !== undefined) {
  await renderStill({
    composition,
    serveUrl: bundled,
    output: process.argv[2] ?? "/tmp/frame-check.png",
    frame: Number(stillFrame),
    puppeteerInstance: browser,
  });
} else {
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: process.argv[2] ?? "/mnt/documents/nxgen-hero-loop.mp4",
    puppeteerInstance: browser,
    muted: true,
    concurrency: 2,
  });
}

await browser.close({ silent: false });
console.log("rendered");
