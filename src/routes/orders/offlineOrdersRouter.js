const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");
const OfflineOrder = require("../../schemas/orders/offlineOrders");
const StockMovement = require("../../schemas/accounting/stockMovement");
const Invoice = require("../../schemas/accounting/InvoiceSchema");
const Product = require("../../schemas/product");
const FinanceOverview = require("../../schemas/finance/financeOverview");
const OfflineSale = require("../../schemas/sales/offlineSales");
const {
  generateUniversalInvoice,
} = require("../../services/generateUniversalInvoice");
const { calculateStock } = require("../../services/calculateStock");
// 🔹 GET: Отримати всі офлайн-замовлення
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const orders = await OfflineOrder.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("🧨 Error fetching offline orders:", error);
    res.status(500).json({ error: "Failed to fetch offline orders" });
  }
});

// 🔹 GET: Отримати замовлення за ID
router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const order = await OfflineOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    res.status(200).json(order);
  } catch (error) {
    console.error("🧨 Error fetching order by ID:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// 🔹 POST: Створити нове офлайн-замовлення
router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const {
      products,
      paymentMethod,
      buyerType,
      buyerName,
      buyerAddress,
      buyerNIP,
      saleDate,
    } = req.body;

    const validMethods = ["BLIK", "bank_transfer"];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    const enrichedProducts = [];
    let totalAmount = 0;

    for (const item of products) {
      // 🔍 Знайти останній складський рух по товару
      const lastMovement = await StockMovement.findOne({
        productId: item.productId,
        type: { $in: ["sale", "purchase"] },
      }).sort({ date: -1 });

      if (
        !lastMovement ||
        !lastMovement.productIndex ||
        !lastMovement.productName
      ) {
        throw new Error(
          `❌ No stock movement found for product ${item.productId}`
        );
      }

      const stockLevel = await calculateStock(lastMovement.productIndex);
      if (stockLevel < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${lastMovement.productName}`,
        });
      }

      const unitPrice =
        lastMovement.unitSalePrice ||
        lastMovement.price || // 💸 ← це твій 58
        productData?.lastRetailPrice ||
        lastMovement.unitPurchasePrice ||
        0;

      totalAmount += unitPrice * item.quantity;

      // 🔧 Тягнемо тільки декоративні дані з Product (фото тощо)
      const productVisual = await Product.findById(item.productId);

      enrichedProducts.push({
        productId: item.productId,
        index: lastMovement?.productIndex || item.index,
        name: lastMovement?.productName || item.name,
        photoUrl: productVisual?.photoUrl || "",
        quantity: item.quantity,
        price: unitPrice, // ✅ з руху
      });
    }

    const order = await OfflineOrder.create({
      products: enrichedProducts,
      totalPrice: totalAmount,
      paymentMethod,
      status: "pending", // 🔹 важливо: не completed!
      buyerType,
      saleDate,
      ...(buyerType === "przedsiębiorca" && {
        buyerName,
        buyerAddress,
        buyerNIP,
      }),
    });

    res.status(201).json({ message: "Offline order created", order });
  } catch (error) {
    console.error("🔥 Error creating offline order:", error);
    res
      .status(500)
      .json({ error: error.message || "Не вдалося створити замовлення" });
  }
});

// 🔹 PATCH: Оновити статус офлайн-замовлення
router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const order = await OfflineOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.status(200).json({ message: "Order status updated", order });
  } catch (error) {
    console.error("🧨 Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order" });
  }
});

module.exports = router;
