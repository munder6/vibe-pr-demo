// Cart total: price × quantity, minus a coupon.
const PRICE = 100;
const COUPONS = { SAVE10: 0.1, SAVE25: 0.25 };

function total(qty, coupon) {
  const subtotal = PRICE * qty;
  const off = COUPONS[coupon] || 0;
  return Math.round(subtotal * (1 - off) * 100) / 100;
}

function render() {
  const qty = Math.max(1, parseInt(document.getElementById("qty").value, 10) || 1);
  // Coupon codes are accepted in any case ("save10", "Save10", "SAVE10").
  const coupon = document.getElementById("coupon").value.trim().toUpperCase();
  document.getElementById("total").textContent = `Total: ${total(qty, coupon)} USD`;
  document.getElementById("note").textContent = coupon && !COUPONS[coupon] ? "That coupon is not valid." : "";
}

document.getElementById("apply").addEventListener("click", render);
document.getElementById("qty").addEventListener("input", render);

document.getElementById("pay").addEventListener("click", async () => {
  const r = await fetch("api/checkout", { method: "POST" }).then((x) => x.json()).catch(() => null);
  document.getElementById("paid").textContent = r && r.ok ? r.message : "Payment failed.";
});
