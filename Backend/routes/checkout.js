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

    // ── Build PayFast payment fields (NO passphrase here) ──────────────────
    const paymentData = {
      merchant_id:  process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url:   process.env.RETURN_URL  || `https://glamborrow.co.za/success.html?orderId=${newOrder.orderId}`,
      cancel_url:   process.env.CANCEL_URL  || "https://glamborrow.co.za/cancel.html",
      notify_url:   process.env.NOTIFY_URL  || "https://glamborrow-1.onrender.com/webhook",
      m_payment_id: newOrder.orderId,
      amount:       parseFloat(amount).toFixed(2),
      item_name:    "Glamborrow Order",
      email_address: customerEmail
    };

    // ── Build the param string from payment fields only ────────────────────
    // Filter out any undefined/null/empty values
    const filteredEntries = Object.entries(paymentData).filter(
      ([_, value]) => value !== undefined && value !== null && value !== ""
    );

    let pfParamString = filteredEntries
      .map(([key, value]) =>
        `${key}=${encodeURIComponent(String(value)).replace(/%20/g, "+")}`
      )
      .join("&");

    // ── Append passphrase ONLY for hashing, not as a URL param ────────────
    // If you have NO passphrase set in PayFast dashboard, leave PAYFAST_SALT
    // unset or empty in your .env — this block will be skipped correctly.
    let hashString = pfParamString;
    const salt = process.env.PAYFAST_SALT;
    if (salt && salt.trim() !== "") {
      hashString += `&passphrase=${encodeURIComponent(salt.trim()).replace(/%20/g, "+")}`;
    }

    const signature = crypto
      .createHash("md5")
      .update(hashString)   // hash includes passphrase (if any)
      .digest("hex");

    // ── Redirect URL uses pfParamString (no passphrase) + signature ───────
    const redirectUrl = `https://sandbox.payfast.co.za/eng/process?${pfParamString}&signature=${signature}`;

    console.log("Param string (no passphrase):", pfParamString);
    console.log("Hash string:", hashString);
    console.log("Signature:", signature);
    console.log("Redirect URL:", redirectUrl);

    res.json({ redirectUrl });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
