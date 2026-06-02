const express = require("express");
const crypto = require("crypto");
const Order = require("../models/Order");

const router = express.Router();

router.post("/webhook", async (req, res) => {
  const data = req.body;
  console.log("Webhook received:", data);

  // Step 1: Build the check string the way PayFast expects it
  const pfData = { ...data };
  delete pfData.signature;

  // Keys must stay in the order PayFast sent them (do NOT sort)
  let checkString = Object.keys(pfData)
    .map((key) => `${key}=${encodeURIComponent(pfData[key] ?? "").replace(/%20/g, "+")}`)
    .join("&");

  // Step 2: Append passphrase if set in your PayFast account
  if (process.env.PAYFAST_SALT) {
    checkString += `&passphrase=${encodeURIComponent(process.env.PAYFAST_SALT).replace(/%20/g, "+")}`;
  }

  console.log("Check string:", checkString);

  const signature = crypto.createHash("md5").update(checkString).digest("hex");
  console.log("Expected signature:", signature);
  console.log("Received signature:", data.signature);

  if (signature === data.signature) {
    console.log("✅ Signature valid. Updating order...");

    try {
      const result = await Order.updateOne(
        { orderId: data.m_payment_id },
        { status: data.payment_status.toLowerCase() }
      );
      console.log("Update result:", result);

      if (result.matchedCount === 0) {
        console.warn("⚠️ No order found with orderId:", data.m_payment_id);
      }
    } catch (err) {
      console.error("❌ MongoDB update error:", err);
    }
  } else {
    console.warn("❌ Invalid signature. Possible spoofed request.");
  }

  res.status(200).send("OK");
});