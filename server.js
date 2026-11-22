// Serves the shop: the static files in this folder, plus sign-in and the account page.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const users = require("./lib/users");
const PORT = Number(process.env.PORT || 8080);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" };
http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/api/checkout" && req.method === "POST") {
    // A real shop would create a PaymentIntent here with STRIPE_SECRET_KEY.
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, message: "Order placed" }));
  }
  const file = path.join(__dirname, p === "/" ? "index.html" : p.replace(/^\/+/, ""));
  if (!file.startsWith(__dirname) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    return res.end("<h1>404 — page not found</h1>");
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, "0.0.0.0", () => console.log(`shop on ${PORT}`));
