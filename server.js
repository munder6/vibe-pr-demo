// Serves the shop: the static files in this folder, plus sign-in and the account page.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const users = require("./lib/users");
const PORT = Number(process.env.PORT || 8080);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const sessions = new Map();

function cookie(req, name) {
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(req.headers.cookie || "");
  return m ? m[1] : null;
}

function readForm(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(Object.fromEntries(new URLSearchParams(body))));
  });
}

const page = (title, inner) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><link rel="stylesheet" href="style.css"></head><body><header><h1>Demo Shop</h1><nav><a href="index.html">Shop</a> · <a href="login">Sign in</a></nav></header><main>${inner}</main></body></html>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function loginForm(error) {
  return page("Sign in", `<section class="cart"><h2>Sign in</h2>${error ? `<p id="note" role="alert">${error}</p>` : ""}<form method="post" action="login"><label>Email <input name="email" type="email" required></label><label>Password <input name="password" type="password" required></label><button type="submit">Sign in</button></form></section>`);
}

http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);

  if (p === "/login" && req.method === "POST") {
    const f = await readForm(req);
    const u = users.check(f.email, f.password);
    if (!u) {
      res.writeHead(401, { "Content-Type": "text/html" });
      return res.end(loginForm("Email or password is incorrect."));
    }
    const sid = crypto.randomBytes(24).toString("hex");
    sessions.set(sid, u.email);
    res.writeHead(303, { Location: "account", "Set-Cookie": `sid=${sid}; HttpOnly; SameSite=Lax; Path=/` });
    return res.end();
  }
  if (p === "/login") {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(loginForm(""));
  }
  if (p === "/logout") {
    sessions.delete(cookie(req, "sid"));
    res.writeHead(303, { Location: "login", "Set-Cookie": "sid=; Max-Age=0; Path=/" });
    return res.end();
  }
  if (p === "/account") {
    const email = sessions.get(cookie(req, "sid"));
    const u = email && users.load().find((x) => x.email === email);
    if (!u) {
      res.writeHead(303, { Location: "login" });
      return res.end();
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(page("Your account", `<section class="product"><h2>Your account</h2><p id="who">Signed in as ${esc(u.email)} (${esc(u.role)})</p><p><a href="logout">Sign out</a></p></section>`));
  }

  const file = path.join(__dirname, p === "/" ? "index.html" : p.replace(/^\/+/, ""));
  if (!file.startsWith(__dirname) || file.includes(`${path.sep}data${path.sep}`) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/html" });
    return res.end("<h1>404 — page not found</h1>");
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, "0.0.0.0", () => console.log(`shop on ${PORT}`));
