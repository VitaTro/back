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
const { calculateDiscount } = require("../../services/discountCalculator");
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

    const validMethods = ["BLIK", "bank_transfer", "terminal", "cash"];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    const enrichedProducts = [];
    let totalAmount = 0;

    for (const item of products) {
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
          `❌ No stock movement found for product ${item.productId}`,
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
        lastMovement.price ||
        productData?.lastRetailPrice ||
        lastMovement.unitPurchasePrice ||
        0;

      totalAmount += unitPrice * item.quantity;

      const productVisual = await Product.findById(item.productId);

      enrichedProducts.push({
        productId: item.productId,
        index: lastMovement?.productIndex || item.index,
        name: lastMovement?.productName || item.name,
        photoUrl: productVisual?.photoUrl || "",
        quantity: item.quantity,
        price: unitPrice,
        size: item.size || null,
        sku: item.sku || null,
      });
    }
    const { discount, discountPercent, final } = calculateDiscount(totalAmount);
    const order = await OfflineOrder.create({
      products: enrichedProducts,
      totalPrice: totalAmount,
      discount,
      discountPercent,
      finalPrice: final,
      paymentMethod,
      status: "pending",
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
      { new: true },
    );

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.status(200).json({ message: "Order status updated", order });
  } catch (error) {
    console.error("🧨 Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order" });
  }
});
// 🔹 POST: Створити РЕЗЕРВАЦІЮ товару
router.post("/reserve", authenticateAdmin, async (req, res) => {
  try {
    const { products, reservationExpiresAt, notes } = req.body;

    if (!products || !products.length) {
      return res.status(400).json({ error: "Products are required" });
    }

    if (!reservationExpiresAt) {
      return res
        .status(400)
        .json({ error: "Reservation expiration date required" });
    }

    const enrichedProducts = [];
    let totalAmount = 0;

    for (const item of products) {
      const lastMovement = await StockMovement.findOne({
        productId: item.productId,
        type: { $in: ["sale", "purchase"] },
      }).sort({ date: -1 });

      if (!lastMovement) {
        return res.status(400).json({
          error: `No stock movement found for product ${item.productId}`,
        });
      }

      const stockLevel = await calculateStock(lastMovement.productIndex);
      if (stockLevel < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${lastMovement.productName}`,
        });
      }

      const productDoc = await Product.findById(item.productId);

      const unitPrice =
        productDoc?.lastRetailPrice ||
        lastMovement.unitSalePrice ||
        lastMovement.price ||
        lastMovement.unitPurchasePrice ||
        0;

      totalAmount += unitPrice * item.quantity;

      enrichedProducts.push({
        productId: item.productId,
        index: lastMovement.productIndex,
        name: lastMovement.productName,
        photoUrl: productDoc?.photoUrl || "",
        quantity: item.quantity,
        price: unitPrice,
        size: item.size || null,
        sku: item.sku || null,
      });

      // 🔥 Знімаємо товар зі складу (резерв = sale)
      await StockMovement.create({
        productId: item.productId,
        productIndex: lastMovement.productIndex,
        productName: lastMovement.productName,
        quantity: item.quantity,
        type: "sale",
        // unitPurchasePrice: unitPrice,
        price: unitPrice,
        saleSource: "OfflineSale",
        unitSalePrice: unitPrice,
        date: new Date(),
        note: "Reservation created",
      });

      // 🔥 Оновлюємо кількість у Product
      const stockCount = await calculateStock(lastMovement.productIndex);
      productDoc.quantity = stockCount;
      productDoc.currentStock = stockCount;
      productDoc.inStock = stockCount > 0;
      await productDoc.save();
    }

    // 🔥 Створюємо резерв як OfflineSale
    const reservation = await OfflineSale.create({
      isReservation: true,
      status: "reserved",
      reservationExpiresAt,
      products: enrichedProducts,
      totalAmount,
      finalPrice: totalAmount,
      paymentMethod: "cash",
      notes,
    });

    res.status(201).json({
      message: "✅ Reservation created",
      reservation,
    });
  } catch (error) {
    console.error("🔥 Error creating reservation:", error);
    res.status(500).json({
      error: error.message || "Failed to create reservation",
    });
  }
});
// 🔹 PATCH: Завершити резерв (клієнт оплатив)
router.patch("/reserve/:id/complete", authenticateAdmin, async (req, res) => {
  try {
    const { paymentMethod } = req.body;

    const validMethods = ["BLIK", "bank_transfer", "terminal", "cash"];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    const reservation = await OfflineSale.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    if (!reservation.isReservation || reservation.status !== "reserved") {
      return res.status(400).json({ error: "This sale is not a reservation" });
    }

    // 🔥 Перетворюємо резерв на продаж
    reservation.status = "completed";
    reservation.paymentMethod = paymentMethod;
    reservation.saleDate = new Date();
    reservation.isReservation = false;
    reservation.reservationExpiresAt = null;

    await reservation.save();

    res.status(200).json({
      message: "✅ Reservation converted to completed sale",
      reservation,
    });
  } catch (error) {
    console.error("🔥 Error completing reservation:", error);
    res.status(500).json({ error: "Failed to complete reservation" });
  }
});
// 🔹 PATCH: Продовжити резерв
router.patch("/reserve/:id/extend", authenticateAdmin, async (req, res) => {
  try {
    const { newDate } = req.body;

    if (!newDate) {
      return res.status(400).json({ error: "New reservation date required" });
    }

    const reservation = await OfflineSale.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    if (!reservation.isReservation || reservation.status !== "reserved") {
      return res
        .status(400)
        .json({ error: "This sale is not an active reservation" });
    }

    // 🔥 Продовжуємо резерв
    reservation.reservationExpiresAt = newDate;
    await reservation.save();

    res.status(200).json({
      message: "✅ Reservation extended",
      reservation,
    });
  } catch (error) {
    console.error("🔥 Error extending reservation:", error);
    res.status(500).json({ error: "Failed to extend reservation" });
  }
});
router.get("/reserve", authenticateAdmin, async (req, res) => {
  const reservations = await OfflineSale.find({ isReservation: true }).sort({
    createdAt: -1,
  });
  res.json(reservations);
});

router.delete("/reserve/:id", authenticateAdmin, async (req, res) => {
  try {
    const reservation = await OfflineSale.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    if (!reservation.isReservation || reservation.status !== "reserved") {
      return res
        .status(400)
        .json({ error: "This sale is not an active reservation" });
    }

    // 🔥 Повертаємо товар на склад
    for (const item of reservation.products) {
      await StockMovement.create({
        productId: item.productId,
        productIndex: item.index,
        productName: item.name,
        quantity: item.quantity,
        type: "restock",
        unitPurchasePrice: item.price,
        price: item.price,
        saleSource: "OfflineSale",
        date: new Date(),
        note: "Reservation cancelled — stock restored",
      });

      // Оновлюємо кількість у Product
      const productDoc = await Product.findById(item.productId);
      const stockCount = await calculateStock(item.index);
      productDoc.quantity = stockCount;
      productDoc.currentStock = stockCount;
      productDoc.inStock = stockCount > 0;
      await productDoc.save();
    }

    await reservation.deleteOne();

    res.status(200).json({ message: "Reservation deleted" });
  } catch (error) {
    console.error("🔥 Error deleting reservation:", error);
    res.status(500).json({ error: "Failed to delete reservation" });
  }
});

module.exports = router;
