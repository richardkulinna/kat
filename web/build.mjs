import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const paths = ["index.html", "styles.css"];
for (const directory of ["colors", "studio"]) {
  const entries = await readdir(new URL(directory + "/", root), { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isFile() && /\.(html|css|mjs)$/.test(entry.name) && !entry.name.endsWith(".test.mjs")) {
      paths.push(directory + "/" + entry.name);
    }
  }
}

const files = Object.fromEntries(await Promise.all(paths.map(async path =>
  ["/" + path, await readFile(new URL(path, root), "utf8")]
)));
const fontPath = "assets/fonts/kulinna-extrabold.woff2";
files["/" + fontPath] = await readFile(new URL(fontPath, root), "base64");
const handler = await readFile(new URL("./handler.mjs", import.meta.url), "utf8");
await mkdir(new URL("./generated/", import.meta.url), { recursive: true });
await writeFile(new URL("./generated/worker.mjs", import.meta.url),
  handler + "\nconst files = " + JSON.stringify(files) +
  ";\nexport default { fetch(request, env) { return serve(request, env, files); } };\n");
