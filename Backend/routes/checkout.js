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
    console.log("✅ Order saved:", newOrder.orderId);

    // ── PayFast fields in EXACT documented order ───────────────────────────
    // https://developers.payfast.co.za/docs
    // "The pairs must be listed in the order in which they appear in the
    //  attributes description. Do NOT use alphabetical ordering!"
    const orderedFields = [
      ["merchant_id",   process.env.PAYFAST_MERCHANT_ID],
      ["merchant_key",  process.env.PAYFAST_MERCHANT_KEY],
      ["return_url",    `https://glamborrow.co.za/success.html?orderId=${newOrder.orderId}`],
      ["cancel_url",    `https://glamborrow.co.za/cancel.html`],
      ["notify_url",    `https://glamborrow-1.onrender.com/webhook`],
      ["m_payment_id",  String(newOrder.orderId)],
      ["amount",        parseFloat(amount).toFixed(2)],
      ["item_name",     "Glamborrow Order"],
      ["email_address", customerEmail]
    ].filter(([, v]) => v !== undefined && v !== null && v !== "");

    // ── Build the string to hash (values encoded, passphrase appended last) 
    const pfString = orderedFields
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v)).replace(/%20/g, "+")}`)
      .join("&");

    const salt = (process.env.PAYFAST_SALT || "").trim();
    const hashInput = salt
      ? `${pfString}&passphrase=${encodeURIComponent(salt).replace(/%20/g, "+")}`
      : pfString;

    const signature = crypto.createHash("md5").update(hashInput).digest("hex");

    console.log("pfString  :", pfString);
    console.log("hashInput :", hashInput);
    console.log("signature :", signature);

    // ── Send ordered pairs to frontend so form inputs stay in same order ──
    // Append signature at the end (it's the last field in the form)
    const formFields = [...orderedFields, ["signature", signature]];

    res.json({
      action: "https://sandbox.payfast.co.za/eng/process",
      fields: formFields   // array of [key, value] pairs — order guaranteed
    });

  } catch (err) {
    console.error("❌ Checkout error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
