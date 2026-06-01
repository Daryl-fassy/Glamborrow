const express = require("express");
const crypto = require("crypto");
const Order = require("../models/order");

const router = express.Router();

router.post("/webhook", async (req, res) => {
  const data = req.body;
  console.log("Webhook received:", data);

  const pfData = { ...data };
  delete pfData.signature;

  let checkString = Object.keys(pfData)
    .map((key) => `${key}=${encodeURIComponent(pfData[key] ?? "").replace(/%20/g, "+")}`)
    .join("&");

  if (process.env.PAYFAST_SALT) {
    checkString += `&passphrase=${encodeURIComponent(process.env.PAYFAST_SALT).replace(/%20/g, "+")}`;
  }

  const signature = crypto.createHash("md5").update(checkString).digest("hex");

  if (signature === data.signature) {
    try {
      await Order.updateOne(
        { orderId: data.m_payment_id },
        { status: data.payment_status.toLowerCase() }
      );
      console.log(`✅ Order ${data.m_payment_id} updated → ${data.payment_status}`);
    } catch (err) {
      console.error("❌ MongoDB update error:", err);
    }
  } else {
    console.warn("❌ Invalid signature.");
  }

  res.status(200).send("OK");
});

module.exports = router;
