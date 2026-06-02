// routes/checkout.js
const express = require("express");
const crypto = require("crypto");
const Order = require("../models/order");

const router = express.Router();

router.post("/checkout", async (req, res) => {
  try {
    const {
      orderId,
      m_payment_id,
      customerEmail,
      schoolName,
      contact,
      whatsapp,
      secretCode,
      cart,
      amount
    } = req.body;

    // ✅ Save order in MongoDB
    const newOrder = new Order({
      orderId,
      email: customerEmail,
      amount,
      status: "pending", // always lowercase for consistency
      createdAt: new Date().toISOString(),
      schoolName,
      contact,
      whatsapp,
      secretCode,
      cart
    });

    await newOrder.save();
    console.log("Order saved:", newOrder);

    // ✅ Build PayFast payment data
    const paymentData = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url: "https://glamborrow-1.onrender.com/success",
      cancel_url: "https://glamborrow-1.onrender.com/cancel",
      notify_url: "https://glamborrow-1.onrender.com/webhook",
      m_payment_id, // must match orderId in DB
      amount,
      item_name: "Glamborrow Order " + orderId,
      email_address: customerEmail
    };

    // ✅ Generate signature
    const keys = Object.keys(paymentData).sort();
    let pfOutput = "";
    keys.forEach(key => {
      pfOutput += `${key}=${encodeURIComponent(paymentData[key].trim()).replace(/%20/g, "+")}&`;
    });
    let getString = pfOutput.slice(0, -1);

    if (process.env.PAYFAST_PASSPHRASE) {
      getString += `&passphrase=${encodeURIComponent(process.env.PAYFAST_PASSPHRASE.trim()).replace(/%20/g, "+")}`;
    }

    const signature = crypto.createHash("md5").update(getString).digest("hex");

    // ✅ Build redirect URL
    const queryString = Object.entries(paymentData)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

    const redirectUrl = `https://sandbox.payfast.co.za/eng/process?${queryString}&signature=${signature}`;

    res.json({ redirectUrl });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
