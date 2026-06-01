const express = require("express");
const crypto = require("crypto");
const Order = require("../models/order");

const router = express.Router();

router.post("/checkout", async (req, res) => {
  try {
    const {
      orderId,
      customerEmail,
      schoolName,
      contact,
      whatsapp,
      secretCode,
      cart,
      amount
    } = req.body;

    const newOrder = new Order({
      orderId: orderId || Date.now().toString(),
      email: customerEmail,
      amount,
      status: "pending",
      createdAt: new Date().toISOString(),
      schoolName,
      contact,
      whatsapp,
      secretCode,
      cart
    });

    await newOrder.save();

    const paymentData = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url: `https://glamborrow.co.za/success.html?orderId=${newOrder.orderId}`,
      cancel_url: `https://glamborrow.co.za/cancel.html`,
      notify_url: `https://glamborrow-1.onrender.com/webhook`,
      m_payment_id: newOrder.orderId,
      amount,
      item_name: "Glamborrow Order",
      email_address: customerEmail
    };

    // Signature
    const keys = Object.keys(paymentData).sort();
    let pfOutput = "";
    keys.forEach(key => {
      pfOutput += `${key}=${encodeURIComponent(paymentData[key]).replace(/%20/g, "+")}&`;
    });
    let getString = pfOutput.slice(0, -1);

    if (process.env.PAYFAST_PASSPHRASE) {
      getString += `&passphrase=${encodeURIComponent(process.env.PAYFAST_PASSPHRASE).replace(/%20/g, "+")}`;
    }

    const signature = crypto.createHash("md5").update(getString).digest("hex");

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
