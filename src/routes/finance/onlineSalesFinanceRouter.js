const express = require("express");
const router = express.Router();
const OnlineSale = require("../../schemas/finance/onlineSales");
const OnlineOrder = require("../../schemas/finance/onlineOrders");
const Product = require("../../schemas/product");
const FinanceOverview = require("../../schemas/finance/financeOverview");
const { validate } = require("../../middleware/validateMiddleware");
const validateOnlineSale = require("../../validation/onlineSalesJoi");

// 🔍 Отримати всі онлайн продажі
router.get("/", async (req, res) => {
  try {
    console.log("🔍 Fetching online sales...");
    const onlineSales = await OnlineSale.find()
      .populate({
        path: "products.productId",
        select: "name photoUrl",
      })
      .populate("processedBy");

    console.log("✅ Online sales fetched:", onlineSales);
    res.status(200).json(onlineSales);
  } catch (error) {
    console.error("🔥 Error in fetching online sales:", error);
    res.status(500).json({ error: "Failed to fetch online sales" });
  }
});

// 📌 Оновлення статусу онлайн-замовлення + автоматичне додавання у продажі
router.patch("/:id", async (req, res) => {
  try {
    console.log(
      `🛠 Updating online order ID: ${req.params.id} with status: ${req.body.status}`
    );

    const { status, processedBy, paymentMethod } = req.body;
    const validStatuses = ["new", "completed", "cancelled"];

    if (!validStatuses.includes(status)) {
      console.warn(`⚠️ Invalid status received: ${status}`);
      return res.status(400).json({ error: "Invalid status" });
    }

    const existingOnlineOrder = await OnlineOrder.findById(req.params.id);
    if (!existingOnlineOrder) {
      console.warn(`⚠️ Online order not found for ID: ${req.params.id}`);
      return res.status(404).json({ error: "Online order not found" });
    }

    if (existingOnlineOrder.status === status) {
      console.warn(`⚠️ Status is already '${status}', no update needed.`);
      return res
        .status(400)
        .json({ error: "Online order already has this status" });
    }

    // ✅ Оновлюємо статус онлайн-замовлення
    existingOnlineOrder.status = status;
    await existingOnlineOrder.save();
    console.log("✅ Online order status updated successfully!");

    // 📌 Якщо статус `"completed"`, додаємо до `OnlineSales`
    if (status === "completed") {
      console.log("📊 Checking if online order is already in OnlineSales...");
      const saleExists = await OnlineSale.findOne({
        onlineOrderId: existingOnlineOrder._id,
      });

      if (!saleExists) {
        console.log("📦 Adding online order to OnlineSales...");

        // ✅ Гарантовано передаємо `processedBy` у форматі ObjectId
        const saleProcessedBy = mongoose.Types.ObjectId.isValid(processedBy)
          ? processedBy
          : null;

        // ✅ `paymentMethod` встановлюється автоматично
        const salePaymentMethod = paymentMethod || "card";

        // ✅ `salePrice` встановлюється автоматично
        const saleProducts = existingOnlineOrder.products.map((product) => ({
          productId: product.productId,
          quantity: product.quantity,
          salePrice: product.salePrice || product.price || 0,
        }));

        const newOnlineSale = new OnlineSale({
          onlineOrderId: existingOnlineOrder._id,
          totalAmount: existingOnlineOrder.totalPrice,
          paymentMethod: salePaymentMethod,
          processedBy: saleProcessedBy, // 🔹 Гарантовано ObjectId або null
          products: saleProducts,
          status: "completed",
          saleDate: new Date(),
        });

        await newOnlineSale.save();
        console.log("✅ Online sale saved successfully!");
      } else {
        console.log("⚠️ Online order is already in OnlineSales, skipping...");
      }
    }
    console.log("🔍 Adding online order ID to FinanceOverview...");
    await FinanceOverview.updateOne(
      {},
      {
        $push: { completedOnlineOrders: existingOnlineOrder._id },
        $inc: { totalRevenue: existingOnlineOrder.totalPrice },
      },
      { upsert: true }
    );

    res.status(200).json({
      message: "Online order updated successfully",
      onlineOrder: existingOnlineOrder,
    });
  } catch (error) {
    console.error("🔥 Error updating online order:", error);
    res.status(500).json({ error: "Failed to update online order" });
  }
});

module.exports = router;
