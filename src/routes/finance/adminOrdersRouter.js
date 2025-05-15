const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middleware/adminMiddleware");
const OnlineOrder = require("../../schemas/finance/onlineOrders");
const OnlineSale = require("../../schemas/finance/onlineSales");
const FinanceOverview = require("../../schemas/finance/financeOverview");

router.use(isAdmin);

router.get("/", async (req, res) => {
  try {
    const onlineOrders = await OnlineOrder.find({})
      .populate("products.productId", "name photoUrl")
      .populate("userId", "email name")
      .sort({ createdAt: -1 });

    res.status(200).json(onlineOrders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch online orders" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { status, updatedBy } = req.body;
    const validStatuses = [
      "new",
      "received",
      "assembled",
      "shipped",
      "completed",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const order = await OnlineOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = status;
    order.statusHistory.push({ status, updatedBy, updatedAt: new Date() });
    await order.save();

    res.status(200).json({ message: "Order status updated", order });
  } catch (error) {
    res.status(500).json({ error: "Failed to update order status" });
  }
});

router.put("/:id/sale", async (req, res) => {
  try {
    const order = await OnlineOrder.findById(req.params.id);
    if (!order || order.status !== "completed") {
      return res.status(400).json({ error: "Order not ready for sale" });
    }

    const newSale = await OnlineSale.create({
      orderId: order._id,
      totalAmount: order.totalPrice,
      paymentMethod: order.paymentMethod,
      saleDate: new Date(),
    });

    await FinanceOverview.updateOne(
      {},
      { $inc: { totalRevenue: order.totalPrice } }
    );

    res
      .status(200)
      .json({ message: "Sale processed successfully", sale: newSale });
  } catch (error) {
    res.status(500).json({ error: "Failed to process sale" });
  }
});

module.exports = router;
