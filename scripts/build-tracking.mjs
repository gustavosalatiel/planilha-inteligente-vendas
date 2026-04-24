import { build } from "esbuild";

await build({
  entryPoints: ["src/lib/tracking/main.ts"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  outfile: "js/tracking.js",
  sourcemap: false,
  legalComments: "none",
});

console.log("tracking.js built");
