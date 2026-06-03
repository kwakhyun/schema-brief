import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

const MAX_GZIP_BYTES = 16 * 1024;
const source = readFileSync(new URL("../src/index.js", import.meta.url));
const gzipBytes = gzipSync(source, { level: 9 }).byteLength;

console.log(`src/index.js raw: ${formatBytes(source.byteLength)}`);
console.log(`src/index.js gzip: ${formatBytes(gzipBytes)}`);

if (gzipBytes > MAX_GZIP_BYTES) {
  throw new Error(`gzip size ${formatBytes(gzipBytes)} exceeds ${formatBytes(MAX_GZIP_BYTES)} budget`);
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}
