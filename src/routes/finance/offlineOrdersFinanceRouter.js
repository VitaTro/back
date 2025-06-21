const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");
const { validate } = require("../../middleware/validateMiddleware");
const offlineOrderValidationSchema = require("../../validation/offlineOrdersJoi");

const Product = require("../../schemas/product");
const OfflineOrder = require("../../schemas/finance/offlineOrders");
const OfflineSale = require("../../schemas/finance/offlineSales");
const FinanceOverview = require("../../schemas/finance/financeOverview");
const generateUniversalInvoice = require("../../services/generateUniversalInvoice");

router.get("/", authenticateAdmin, async (req, res) => {
  try {
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

router.post(
  "/",
  authenticateAdmin,
  validate(offlineOrderValidationSchema),
  async (req, res) => {
    try {
      const {
        products,
        totalPrice,
        paymentMethod,
        buyerType,
        buyerName,
        buyerAddress,
        buyerNIP,
        // notes,
      } = req.body;

      const validPaymentMethods = ["BLIK", "bank_transfer"];
      if (!validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({ error: "Invalid payment method" });
      }

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
            quantity: product.quantity,
            name: dbProduct.name,
            price: dbProduct.price,
            photoUrl: dbProduct.photoUrl,
          };
        })
      );

      const newOfflineOrder = await OfflineOrder.create({
        products: offlineOrderProducts,
        totalPrice,
        paymentMethod,
        // notes,
        status: "completed",
        buyerType,
        ...(buyerType === "przedsiębiorca" && {
          buyerName,
          buyerAddress,
          buyerNIP,
        }),
      });

      const newOfflineSale = await OfflineSale.create({
        orderId: newOfflineOrder._id,
        products: offlineOrderProducts,
        totalAmount: totalPrice,
        paymentMethod,
        status: "completed",
        saleDate: new Date(),
      });

      await FinanceOverview.updateOne(
        {},
        {
          $inc: { totalRevenue: totalPrice },
          $push: { completedOrders: newOfflineOrder._id },
        },
        { upsert: true }
      );

      // Генеруємо інвойс
      console.log("🧾 Старт генерації інвойсу");
      const invoice = await generateUniversalInvoice(newOfflineSale, {
        mode: "offline",
        buyerType: buyerType || "anonim",
        ...(buyerType === "przedsiębiorca" && {
          buyerName,
          buyerAddress,
          buyerNIP,
        }),
      });
      console.log("📄 Інвойс створено:", invoice);
      res.status(201).json({
        message: "Offline order and sale recorded successfully",
        order: newOfflineOrder,
        sale: newOfflineSale,
        invoice,
      });
    } catch (error) {
      console.error("🔥 Error creating offline order:", error);
      res.status(500).json({
        error: error.message || "Failed to create offline order & sale",
      });
    }
  }
);

router.get("/:id", authenticateAdmin, async (req, res) => {
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

router.patch("/:id", authenticateAdmin, async (req, res) => {
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

    let newSale = null;
    let invoice = null;

    if (status === "completed") {
      newSale = await OfflineSale.create({
        orderId: offlineOrder._id,
        products: offlineOrder.products,
        totalAmount: offlineOrder.totalPrice,
        paymentMethod: offlineOrder.paymentMethod,
        status: "completed",
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

      // Генеруємо інвойс при завершенні
      invoice = await generateUniversalInvoice(newSale, {
        mode: "offline",
        buyerType: offlineOrder.buyerType || "anonim",
        ...(offlineOrder.buyerType === "przedsiębiorca" && {
          buyerName: offlineOrder.buyerName,
          buyerAddress: offlineOrder.buyerAddress,
          buyerNIP: offlineOrder.buyerNIP,
        }),
      });
    }

    res.status(200).json({
      message: "Offline order updated successfully",
      order: offlineOrder,
      sale: newSale,
      invoice,
    });
  } catch (error) {
    console.error("🔥 Error updating offline order:", error);
    res.status(500).json({ error: "Failed to update offline order" });
  }
});

module.exports = router;
