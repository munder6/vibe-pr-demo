// Serves the shop locally exactly as GitHub Pages does: the static files in this folder.
const http = require("http");
const fs = require("fs");
const path = require("path");
const PORT = Number(process.env.PORT || 8080);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = path.join(__dirname, p === "/" ? "index.html" : p.replace(/^\/+/, ""));
  if (!file.startsWith(__dirname) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/html" });
    return res.end("<h1>404 — page not found</h1>");
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, "0.0.0.0", () => console.log(`shop on ${PORT}`));
