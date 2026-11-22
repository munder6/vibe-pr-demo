// Serves the shop locally exactly as GitHub Pages does: the static files in this folder.
const http = require("http");
const fs = require("fs");
const path = require("path");
const PORT = Number(process.env.PORT || 8080);
// Checkout talks to Stripe from the server: without a secret key nothing can be paid for.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
if (!/^sk_(test|live)_/.test(STRIPE_SECRET_KEY)) {
  console.error("STRIPE_SECRET_KEY is missing or not a Stripe secret key (sk_test_... / sk_live_...). Checkout cannot start.");
  process.exit(1);
}
// Same figures as cart.js (PRICE, COUPONS) — the page and the server must agree on the amount.
const PRICE = 100;
const COUPONS = { SAVE10: 0.1, SAVE25: 0.25 };
// No payment provider is wired in yet: the key above is only format-checked, never used to charge.
// Until one is, checkout must refuse — it may never answer success without an order reference.
const paymentProvider = null;

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function checkout(req, res) {
  let raw = "";
  let tooBig = false;
  req.on("data", (chunk) => {
    raw += chunk;
    if (raw.length > 10000) { tooBig = true; req.destroy(); }
  });
  req.on("end", () => {
    if (tooBig) return;
    let body;
    try { body = JSON.parse(raw); } catch { body = null; }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return sendJson(res, 400, { ok: false, message: "The order could not be read. Your order was not placed." });
    }
    const qty = body.qty;
    if (!Number.isInteger(qty) || qty < 1) {
      return sendJson(res, 400, { ok: false, message: "Quantity must be a whole number of 1 or more. Your order was not placed." });
    }
    const coupon = body.coupon == null ? "" : body.coupon;
    if (typeof coupon !== "string") {
      return sendJson(res, 400, { ok: false, message: "The coupon could not be read. Your order was not placed." });
    }
    const code = coupon.trim();
    if (code && !Object.prototype.hasOwnProperty.call(COUPONS, code)) {
      return sendJson(res, 422, { ok: false, message: "That coupon is not valid. Your order was not placed." });
    }
    const amount = Math.round(PRICE * qty * (1 - (code ? COUPONS[code] : 0)) * 100) / 100;
    if (body.total !== undefined && body.total !== amount) {
      return sendJson(res, 422, { ok: false, message: `The total does not match the order. It should be ${amount} USD. Your order was not placed.` });
    }
    if (!paymentProvider) {
      return sendJson(res, 503, { ok: false, amount, message: "Payment is not available yet. Your order was not placed and you were not charged." });
    }
    // A provider must return an order reference; without one there is no order to confirm.
    const orderRef = paymentProvider.charge(amount);
    if (!orderRef) return sendJson(res, 502, { ok: false, amount, message: "Payment did not go through. Your order was not placed." });
    sendJson(res, 200, { ok: true, amount, orderRef });
  });
}
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/api/checkout" && req.method === "POST") return checkout(req, res);
  const file = path.join(__dirname, p === "/" ? "index.html" : p.replace(/^\/+/, ""));
  if (!file.startsWith(__dirname) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/html" });
    return res.end("<h1>404 — page not found</h1>");
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, "0.0.0.0", () => console.log(`shop on ${PORT}`));
