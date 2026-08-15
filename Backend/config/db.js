const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true }, 
  email: String,
  schoolName: String,
  contact: String,
  whatsapp: String,
  cart: [
    {
      name: String,
      quantity: Number,
      price: String,
      image: String,
    }
  ],
  totalAmount: String,
  status: { type: String, default: "pending" },
});

module.exports = mongoose.model("order", orderSchema);