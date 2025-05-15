const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const OfflineOrder = require("../../schemas/finance/offlineOrders");
const Product = require("../../schemas/product");
const OfflineSale = require("../../schemas/finance/offlineSales");
const FinanceOverview = require("../../schemas/finance/financeOverview");
const { validate } = require("../../middleware/validateMiddleware");
const offlineOrderValidationSchema = require("../../validation/offlineOrdersJoi");
const { isAdmin } = require("../../middleware/adminMiddleware");

router.use(isAdmin);

router.get("/", async (req, res) => {
  try {
    console.log("🔍 Fetching offline orders...");

    const filter = req.query.status
      ? { status: req.query.status }
      : { status: { $ne: "archived" } };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const offlineOrders = await OfflineOrder.find(filter)
      .populate("products.productId", "name photoUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (!offlineOrders.length) {
      return res.status(404).json({ error: "No offline orders available" });
    }

    res.status(200).json({ offlineOrders, page, limit });
  } catch (error) {
    console.error("🔥 Error fetching offline orders:", error);
    res.status(500).json({ error: "Failed to fetch offline orders" });
  }
});

router.post("/", validate(offlineOrderValidationSchema), async (req, res) => {
  try {
    const { products, totalPrice, paymentMethod, paymentStatus } = req.body;

    const offlineOrderProducts = await Promise.all(
      products.map(async (product) => {
        const dbProduct = await Product.findById(product.productId);
        if (!dbProduct || dbProduct.quantity < product.quantity) {
          throw new Error(
            `Insufficient stock for ${dbProduct?.name || "product"}`
          );
        }

        dbProduct.quantity -= product.quantity;
        await dbProduct.save();

        return {
          productId: dbProduct._id,
          name: dbProduct.name,
          price: dbProduct.price,
          quantity: product.quantity,
          photoUrl: dbProduct.photoUrl,
        };
      })
    );

    const newOfflineOrder = await OfflineOrder.create({
      products: offlineOrderProducts,
      totalPrice,
      paymentMethod,
      paymentStatus: paymentStatus || "pending",
      status: "pending",
    });

    if (paymentStatus === "paid") {
      await FinanceOverview.updateOne(
        {},
        { $push: { completedOrders: newOfflineOrder._id } },
        { upsert: true }
      );
    }

    res
      .status(201)
      .json({
        message: "Offline order created successfully",
        order: newOfflineOrder,
      });
  } catch (error) {
    console.error("🔥 Error creating offline order:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to create offline order" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const offlineOrder = await OfflineOrder.findById(req.params.id).populate(
      "products.productId",
      "name photoUrl price"
    );

    if (!offlineOrder) {
      return res.status(404).json({ error: "Offline order not found" });
    }

    res.status(200).json(offlineOrder);
  } catch (error) {
    console.error("🔥 Error fetching offline order:", error);
    res.status(500).json({ error: "Failed to fetch offline order" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "completed", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const offlineOrder = await OfflineOrder.findById(req.params.id);
    if (!offlineOrder) {
      return res.status(404).json({ error: "Offline order not found" });
    }

    offlineOrder.status = status;
    await offlineOrder.save();

    if (status === "completed") {
      await OfflineSale.create({
        orderId: offlineOrder._id,
        totalAmount: offlineOrder.totalPrice,
        paymentMethod: offlineOrder.paymentMethod,
        products: offlineOrder.products,
        saleDate: new Date(),
      });

      await OfflineOrder.deleteOne({ _id: offlineOrder._id });
      await FinanceOverview.updateOne(
        {},
        {
          $push: { completedOrders: offlineOrder._id },
          $inc: { totalRevenue: offlineOrder.totalPrice },
        },
        { upsert: true }
      );
    }

    res
      .status(200)
      .json({
        message: "Offline order updated successfully",
        order: offlineOrder,
      });
  } catch (error) {
    console.error("🔥 Error updating offline order:", error);
    res.status(500).json({ error: "Failed to update offline order" });
  }
});

module.exports = router;
