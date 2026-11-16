/**
 * Serves the static export in `out` at /vox-vtxprog-editor.
 * `next start` cannot host an `output: "export"` build.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";

const root = join(process.cwd(), "out");
const prefix = "/vox-vtxprog-editor";
const port = Number(process.env.PORT || 4179);
const host = "127.0.0.1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function fileFor(pathname) {
  let rel = pathname.slice(prefix.length) || "/";
  if (rel.endsWith("/")) rel += "index.html";
  const file = normalize(join(root, rel));
  if (file !== root && !file.startsWith(root + sep)) return null;
  return file;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${host}`);
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") {
    response.writeHead(302, { Location: `${prefix}/` });
    response.end();
    return;
  }
  if (!pathname.startsWith(prefix)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  const file = fileFor(pathname);
  if (!file) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }
  try {
    const body = await readFile(file);
    const type = types[extname(file)] ?? "application/octet-stream";
    response.writeHead(200, { "Content-Type": type });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`Preview at http://${host}:${port}${prefix}/`);
});
