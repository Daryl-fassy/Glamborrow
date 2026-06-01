
// controllers.js
// This file contains the controller functions for handling checkout and webhook requests.
// It is imported by the respective route files to define the API endpoints.
// Note: In a real application, you would want to add proper validation, error handling, and security measures (e.g., validating webhook signatures).

exports.checkout = (req, res) => {
  const { amount, customerEmail } = req.body;

  const payload = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    amount,
    item_name: "Order #123",
    email_address: customerEmail,
    return_url: "https://yourapp.com/success",
    cancel_url: "https://yourapp.com/cancel",
    notify_url: "https://yourapp.com/webhook",
  };

  res.json({ redirectUrl: `https://www.payfast.co.za/eng/process?${new URLSearchParams(payload)}` });
};
