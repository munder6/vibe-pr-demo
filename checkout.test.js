// Checkout contract: the server may only say an order was placed when it has an order reference.
const test = require("node:test");
const assert = require("node:assert");
const net = require("node:net");
const { spawn } = require("node:child_process");

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}

let child, base;
test.before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ["server.js"], { env: { ...process.env, PORT: String(port), STRIPE_SECRET_KEY: "sk_test_placeholder" }, stdio: "pipe" });
  for (let i = 0; i < 50; i++) {
    try { await fetch(base + "/"); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error("server did not start");
});
test.after(() => child && child.kill());

const post = (body) => fetch(base + "/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body });

test("no body is refused, not accepted", async () => {
  const r = await fetch(base + "/api/checkout", { method: "POST" });
  assert.ok(r.status >= 400 && r.status < 500, `status ${r.status}`);
  assert.notStrictEqual((await r.json()).ok, true);
});

test("unparseable body is a 400", async () => {
  assert.strictEqual((await post("{nope")).status, 400);
});

test("bad quantity is a 4xx", async () => {
  for (const qty of [0, -1, 1.5, "7", null]) {
    const r = await post(JSON.stringify({ qty }));
    assert.ok(r.status >= 400 && r.status < 500, `qty ${qty} gave ${r.status}`);
  }
});

test("total that disagrees with the server's amount is a 422", async () => {
  assert.strictEqual((await post(JSON.stringify({ qty: 7, total: 100 }))).status, 422);
});

test("unknown coupon is refused", async () => {
  assert.strictEqual((await post(JSON.stringify({ qty: 7, coupon: "BOGUS" }))).status, 422);
});

test("valid order with no payment provider is 503 with the computed amount and no success", async () => {
  const cases = [[7, "", 700], [3, "", 300], [2, "SAVE10", 180], [1, " SAVE25 ", 75]];
  for (const [qty, coupon, amount] of cases) {
    const r = await post(JSON.stringify({ qty, coupon, total: amount }));
    const j = await r.json();
    assert.strictEqual(r.status, 503);
    assert.strictEqual(j.amount, amount);
    assert.notStrictEqual(j.ok, true);
    assert.ok(!j.orderRef);
    assert.ok(!/^order placed/i.test(j.message));
  }
});

test("static files still served", async () => {
  const r = await fetch(base + "/index.html");
  assert.strictEqual(r.status, 200);
});
