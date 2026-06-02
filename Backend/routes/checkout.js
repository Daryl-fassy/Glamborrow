const express = require("express");
const crypto = require("crypto");
const Order = require("../models/Order");

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
      orderId,
      email: customerEmail,
      amount,
      status: "pending",
      schoolName,
      contact,
      whatsapp,
      secretCode,
      cart
    });

    await newOrder.save();
    console.log("Order saved:", newOrder.orderId);

    const paymentData = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url: process.env.RETURN_URL || `https://glamborrow.co.za/success.html?orderId=${newOrder.orderId}`,
      cancel_url: process.env.CANCEL_URL || "https://glamborrow.co.za/cancel.html",
      notify_url: process.env.NOTIFY_URL || "https://glamborrow-1.onrender.com/webhook",
      m_payment_id: newOrder.orderId,
      amount: parseFloat(amount).toFixed(2),
      item_name: "Glamborrow Order",
      email_address: customerEmail
    };

    let pfParamString = Object.entries(paymentData)
      .filter(([_, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) =>
        `${key}=${encodeURIComponent(value).replace(/%20/g, "+")}`
      )
      .join("&");

    if (process.env.PAYFAST_SALT) {
      pfParamString += `&passphrase=${encodeURIComponent(process.env.PAYFAST_SALT).replace(/%20/g, "+")}`;
    }

    const signature = crypto
      .createHash("md5")
      .update(pfParamString)
      .digest("hex");

    const redirectUrl = `https://sandbox.payfast.co.za/eng/process?${pfParamString}&signature=${signature}`;

    res.json({ redirectUrl });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;