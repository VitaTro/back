const express = require("express");
const router = express.Router();
const Payment = require("../../schemas/paymentSchema");
const OnlineOrder = require("../../schemas/orders/onlineOrders");
const OnlineSale = require("../../schemas/sales/onlineSales");
const { error } = require("../../validation/onlineSalesJoi");

router.post("/webhook", async (req, res) => {
  try {
    const { transactionId, status } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: "Brak transactionId" });
    }
    const payment = await Payment.findOne({ transactionId });
    if (!payment) {
      return res.status(404).json({ error: "Nie znaleziono płatności" });
    }
    if (status === "correct") {
      payment.status = "paid";
      await payment.save();
      const order = await OnlineOrder.findById(payment.orderId);
      if (order) {
        order.status = "paid";
        order.paymentStatus = "paid";
        await order.save();

        await OnlineSale.create({
          userId: order.userId,
          onlineOrderId: order._id,
          products: order.products.map((p) => ({
            productId: p.productId,
            quantity: p.quantity,
            salePrice: p.price,
          })),
          totalAmount: payment.amount,
          shippingCost: order.shippingCost || 0,
          paymentMethod: "tpay",
          status: "completed",
          saleDate: new Date(),
        });
      }
    }
    res.status(200).json({ message: "OK" });
  } catch (error) {
    console.error("❌ TPAY WEBHOOK ERROR:", error);
    res.status(500).json({ error: "Webhook error" });
  }
});
module.exports = router;
