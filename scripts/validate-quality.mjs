import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "styles/app.css",
  "scripts/app.js",
  "registro.js",
  "sw.js",
  "manifest.webmanifest",
  "version.json",
];

for (const file of requiredFiles) {
  await access(file);
}

const app = await readFile("scripts/app.js", "utf8");
const versionData = JSON.parse(await readFile("version.json", "utf8"));
const manifest = JSON.parse(await readFile("manifest.webmanifest", "utf8"));

if (!Number.isInteger(versionData.v) || versionData.v < 1) {
  throw new Error("version.json must contain a positive integer in v");
}

const versionMatch = app.match(/\bconst\s+VERSION\s*=\s*(\d+)\s*;/);
if (!versionMatch) {
  throw new Error("scripts/app.js must declare const VERSION");
}

if (Number(versionMatch[1]) !== versionData.v) {
  throw new Error(
    `Version mismatch: scripts/app.js=${versionMatch[1]}, version.json=${versionData.v}`,
  );
}

if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
  throw new Error("manifest.webmanifest must declare at least one icon");
}

for (const icon of manifest.icons) {
  if (!icon.src || icon.src.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(icon.src)) {
    throw new Error(`Manifest icon must be a local path: ${icon.src}`);
  }

  const localPath = icon.src.replace(/^\.\//, "").split("?")[0];
  await access(localPath);
}

console.log(
  `Validated static Nucleo preview: version v${versionData.v}, ${requiredFiles.length} core files and ${manifest.icons.length} PWA icons.`,
);
