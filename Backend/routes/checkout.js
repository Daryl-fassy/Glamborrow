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

    // ── Step 1: Define all PayFast fields as plain strings ────────────────
    // DO NOT encode these values here — PayFast does the encoding itself
    const paymentData = {
      merchant_id:   process.env.PAYFAST_MERCHANT_ID,
      merchant_key:  process.env.PAYFAST_MERCHANT_KEY,
      return_url:    `https://glamborrow.co.za/success.html?orderId=${newOrder.orderId}`,
      cancel_url:    `https://glamborrow.co.za/cancel.html`,
      notify_url:    `https://glamborrow-1.onrender.com/webhook`,
      m_payment_id:  String(newOrder.orderId),
      amount:        parseFloat(amount).toFixed(2),
      item_name:     "Glamborrow Order",
      email_address: customerEmail
    };

    // ── Step 2: Build signature string exactly as PayFast specifies ───────
    // Rules:
    //   - Use the field values as-is (no pre-encoding)
    //   - encode each value with encodeURIComponent then replace %20 with +
    //   - join with &
    //   - append passphrase the same way (only if set)
    //   - MD5 hash the result
    const pfString = Object.entries(paymentData)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`)
      .join("&");

    const salt = (process.env.PAYFAST_SALT || "").trim();
    const hashInput = salt
      ? `${pfString}&passphrase=${encodeURIComponent(salt).replace(/%20/g, "+")}`
      : pfString;

    const signature = crypto.createHash("md5").update(hashInput).digest("hex");

    console.log("pfString   :", pfString);
    console.log("hashInput  :", hashInput);
    console.log("signature  :", signature);

    // ── Step 3: Return fields + signature to the frontend ────────────────
    // The frontend will build an auto-submitting HTML form and POST directly
    // to PayFast. This avoids any double-encoding that happens with redirect URLs.
    res.json({
      action: "https://sandbox.payfast.co.za/eng/process",
      fields: { ...paymentData, signature }
    });

  } catch (err) {
    console.error("❌ Checkout error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
