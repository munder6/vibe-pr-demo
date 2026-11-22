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

const payButton = document.getElementById("pay");
const paid = document.getElementById("paid");

payButton.addEventListener("click", async () => {
  if (payButton.disabled) return;
  payButton.disabled = true;
  paid.textContent = "";
  const qty = Math.max(1, parseInt(document.getElementById("qty").value, 10) || 1);
  const coupon = document.getElementById("coupon").value.trim();
  const failed = "Payment failed. Your order was not placed.";
  try {
    const res = await fetch("api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty, coupon }),
    });
    const data = await res.json().catch(() => null);
    // "Order placed" is written only when the server answers with an order reference.
    if (res.ok && data && data.ok && data.orderRef) paid.textContent = `Order placed (reference ${data.orderRef})`;
    else paid.textContent = (data && data.message) || failed;
  } catch {
    paid.textContent = failed;
  } finally {
    payButton.disabled = false;
  }
});
