document.getElementById("checkout").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const schoolName = document.getElementById("school").value;
  const contact = document.getElementById("contact").value;
  const whatsapp = document.getElementById("whatsapp").value;
  const secretCode = document.getElementById("secretCode").value;

  const orderId = Date.now().toString();
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const amount = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0).toFixed(2);

  try {
    const response = await fetch("https://glamborrow-1.onrender.com/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        customerEmail: email,
        schoolName,
        contact,
        whatsapp,
        secretCode,
        cart,
        amount
      })
    });

    const data = await response.json();
    if (data.redirectUrl) {
      window.location.href = data.redirectUrl;
    }
  } catch (err) {
    console.error("Checkout error:", err);
    alert("Something went wrong. Please try again.");
  }
});
