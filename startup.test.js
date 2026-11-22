// Start-up contract: the shop serves with no payment setup; only paying needs STRIPE_SECRET_KEY.
const test = require("node:test");
const assert = require("node:assert");
const net = require("node:net");
const { spawn } = require("node:child_process");

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}

async function start(key) {
  const port = await freePort();
  const env = { ...process.env, PORT: String(port) };
  delete env.STRIPE_SECRET_KEY;
  if (key !== undefined) env.STRIPE_SECRET_KEY = key;
  const child = spawn(process.execPath, ["server.js"], { env, stdio: "pipe" });
  let exited = null;
  child.on("exit", (code) => { exited = code; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    if (exited !== null) throw new Error(`server exited at start-up with code ${exited}`);
    try { await fetch(base + "/"); return { child, base }; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  child.kill();
  throw new Error("server did not start");
}

const order = (base) => fetch(base + "/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qty: 3, total: 300 }) });

for (const [label, key] of [["no key", undefined], ["a key of the wrong shape", "not-a-key"], ["a placeholder in sk_test_ shape", "sk_test_placeholder"]]) {
  test(`shop serves its pages and the cart script with ${label}`, async () => {
    const { child, base } = await start(key);
    try {
      assert.strictEqual((await fetch(base + "/")).status, 200);
      assert.strictEqual((await fetch(base + "/cart.js")).status, 200);
    } finally { child.kill(); }
  });
}

test("with no key, Pay gets a clear non-2xx answer and the shop keeps serving", async () => {
  const { child, base } = await start(undefined);
  try {
    const r = await order(base);
    const j = await r.json();
    assert.ok(r.status >= 400, `status ${r.status}`);
    assert.notStrictEqual(j.ok, true);
    assert.ok(!j.orderRef);
    assert.match(j.message, /STRIPE_SECRET_KEY is missing/);
    assert.match(j.message, /not charged/);
    assert.strictEqual((await fetch(base + "/")).status, 200);
  } finally { child.kill(); }
});

test("with a wrong-shape key, Pay is refused the same way", async () => {
  const { child, base } = await start("not-a-key");
  try {
    const r = await order(base);
    assert.ok(r.status >= 400);
    assert.match((await r.json()).message, /STRIPE_SECRET_KEY is missing/);
  } finally { child.kill(); }
});
