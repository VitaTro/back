const express = require("express");

const router = express.Router();

const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

const { calculateStock } = require("../../services/calculateStock");
const OfflineOrder = require("../../schemas/orders/offlineOrders");
const StockMovement = require("../../schemas/accounting/stockMovement");
const Product = require("../../schemas/product");
const OfflineSale = require("../../schemas/sales/offlineSales");
const FinanceOverview = require("../../schemas/finance/financeOverview");
const Invoice = require("../../schemas/accounting/InvoiceSchema");
const generateInvoicePDFOffline = require("../../config/invoicePdfGeneratorOffline");
const { calculateDiscount } = require("../../services/discountCalculator");
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const offlineSales = await OfflineSale.find(filter).populate(
      "products.productId",
      "name photoUrl price",
    );

    if (!offlineSales.length) {
      return res.status(404).json({ error: "No offline sales available" });
    }

    res.status(200).json(offlineSales);
  } catch (error) {
    console.error("🔥 Error fetching offline sales:", error);
    res.status(500).json({ error: "Failed to fetch offline sales" });
  }
});

router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const { orderId, saleDate } = req.body;

    const order = await OfflineOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "❌ Замовлення не знайдено" });
    }

    if (order.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Order already completed or cancelled" });
    }

    const enrichedProducts = [];
    let totalAmount = 0;

    for (const item of order.products) {
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
          `❌ Немає даних зі складу для товару ${item.productId}`,
        );
      }

      const stockLevel = await calculateStock(lastMovement.productIndex);
      if (stockLevel < item.quantity) {
        return res.status(400).json({
          error: `Недостатньо ${lastMovement.productName} на складі`,
        });
      }

      const productData = await Product.findById(item.productId);
      const unitPrice =
        lastMovement.unitSalePrice ||
        productData?.lastRetailPrice ||
        lastMovement.price ||
        lastMovement.unitPurchasePrice ||
        0;

      totalAmount += unitPrice * item.quantity;

      enrichedProducts.push({
        productId: item.productId,
        index: lastMovement.productIndex,
        name: lastMovement.productName,
        quantity: item.quantity,
        price: unitPrice,
        photoUrl: productData?.photoUrl || "",
      });
    }
    let discount = 0;
    let discountPercent = 0;
    let final = 0;

    if (order.discount) {
      discount = order.discount;
      discountPercent = order.discountPercent;
      final = order.finalPrice;
    } else {
      const calculated = calculateDiscount(totalAmount);
      discount = calculated.discount;
      discountPercent = calculated.discountPercent;
      final = calculated.final;
    }
    const sale = await OfflineSale.create({
      orderId,
      products: enrichedProducts,
      totalAmount,
      discount,
      discountPercent,
      finalPrice: final,
      paymentMethod: order.paymentMethod,
      buyerType: order.buyerType,
      ...(order.buyerType === "przedsiębiorca" && {
        buyerName: order.buyerName,
        buyerAddress: order.buyerAddress,
        buyerNIP: order.buyerNIP,
      }),
      status: "completed",
      saleDate: saleDate || new Date(),
    });

    for (const product of enrichedProducts) {
      await StockMovement.create({
        productId: product.productId,
        productIndex: product.index,
        productName: product.name,
        quantity: product.quantity,
        type: "sale",
        unitSalePrice: product.price,
        price: product.price,
        relatedSaleId: sale._id,
        saleSource: "OfflineSale",
        date: sale.saleDate,
        note: "Списання при продажу",
      });

      const productDoc = await Product.findById(product.productId);
      if (productDoc) {
        const stockCount = await calculateStock(product.index);
        productDoc.quantity = stockCount;
        productDoc.currentStock = stockCount;
        productDoc.inStock = stockCount > 0;
        await productDoc.save();
      }
    }

    await FinanceOverview.updateOne(
      {},
      {
        $inc: { totalRevenue: final },
        $push: { completedSales: sale._id },
      },
      { upsert: true },
    );

    // 📌 Фактура створюється вручну при потребі — цей блок залишено на всякий випадок
    /*
    const invoice = new Invoice({
      orderId,
      invoiceType: "offline",
      totalAmount,
      paymentMethod: order.paymentMethod,
      buyerType: order.buyerType,
      ...(order.buyerType === "przedsiębiorca" && {
        buyerName: order.buyerName,
        buyerAddress: order.buyerAddress,
        buyerNIP: order.buyerNIP,
      }),
    });

    await invoice.validate();
    await invoice.save();
    */

    order.status = "completed";
    await order.save();

    res.status(201).json({
      message: "Продаж успішно завершено",
      sale,
      // invoice, // якщо колись згенеруєш
    });
  } catch (error) {
    console.error("🔥 Error completing sale:", error);
    res.status(500).json({ error: error.message || "Помилка обробки продажу" });
  }
});

router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "completed", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const sale = await OfflineSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: "Offline sale not found" });

    sale.status = status;
    await sale.save();

    res
      .status(200)
      .json({ message: "Offline sale updated successfully", sale });
  } catch (error) {
    console.error("🔥 Error updating offline sale:", error);
    res.status(500).json({ error: "Failed to update offline sale" });
  }
});

router.put("/:id/return", authenticateAdmin, async (req, res) => {
  try {
    const { refundAmount } = req.body;
    if (refundAmount < 0) {
      return res
        .status(400)
        .json({ error: "Refund amount cannot be negative" });
    }

    const sale = await OfflineSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    if (sale.status === "returned")
      return res.status(400).json({ error: "Sale already returned" });

    for (const item of sale.products) {
      // 📦 Склад бачить повернення
      await StockMovement.create({
        productId,
        productIndex: item.index,
        productName: item.name,
        quantity: item.quantity,
        type: "return",
        unitPurchasePrice: item.price, // або item.unitPurchasePrice якщо є
        price: item.price,
        relatedSaleId: sale._id,
        saleSource: "OfflineSale",
        date: new Date(),
        note: "Повернення товару після продажу",
      });
    }

    // 💰 Оновлення фінансів
    await FinanceOverview.updateOne(
      {},
      {
        $inc: {
          totalRevenue: -Math.min(
            refundAmount,
            sale.finalPrice || sale.totalAmount,
          ),
        },
      },
    );

    // 🌀 Статус продажу
    sale.status = "returned";
    sale.refundAmount = refundAmount;
    await sale.save();

    res.status(200).json({ message: "Повернення завершено", sale });
  } catch (error) {
    console.error("🔥 Return processing error:", error);
    res.status(500).json({ error: "Не вдалося обробити повернення" });
  }
});
router.get("/reserve", authenticateAdmin, async (req, res) => {
  try {
    const reservations = await OfflineSale.find({ status: "reserved" }).sort({
      createdAt: -1,
    });

    res.json(reservations);
  } catch (error) {
    console.error("🔥 Error fetching reservations:", error);
    res.status(500).json({ error: "Failed to fetch reservations" });
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

    const expiresAt = new Date(reservationExpiresAt);
    expiresAt.setHours(23, 59, 59, 999);

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
      });

      // 🔥 Знімаємо товар зі складу (резерв = sale)
      await StockMovement.create({
        productId: item.productId,
        productIndex: lastMovement.productIndex,
        productName: lastMovement.productName,
        quantity: item.quantity,
        type: "sale",
        unitPurchasePrice: unitPrice,
        price: unitPrice,
        saleSource: "OfflineReservation",
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

    const reservation = await OfflineSale.create({
      orderId: new mongoose.Types.ObjectId(), // фіктивний orderId
      products: enrichedProducts,
      totalAmount,
      finalPrice: totalAmount,
      paymentMethod: "cash", // неважливо, бо це резерв
      status: "reserved",
      isReservation: true,
      reservationExpiresAt: expiresAt,
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
      return res
        .status(400)
        .json({ error: "This sale is not an active reservation" });
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
// 🔹 PATCH: Скасувати резерв вручну
router.patch("/reserve/:id/cancel", authenticateAdmin, async (req, res) => {
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
        type: "return",
        unitPurchasePrice: item.price,
        price: item.price,
        saleSource: "OfflineReservationCancelled",
        relatedSaleId: reservation._id,
        date: new Date(),
        note: "Reservation cancelled manually",
      });

      const productDoc = await Product.findById(item.productId);
      if (productDoc) {
        const stockCount = await calculateStock(item.index);
        productDoc.quantity = stockCount;
        productDoc.currentStock = stockCount;
        productDoc.inStock = stockCount > 0;
        await productDoc.save();
      }
    }

    reservation.status = "cancelled";
    reservation.isReservation = false;
    reservation.reservationExpiresAt = null;

    await reservation.save();

    res.status(200).json({
      message: "❌ Reservation cancelled",
      reservation,
    });
  } catch (error) {
    console.error("🔥 Error cancelling reservation:", error);
    res.status(500).json({ error: "Failed to cancel reservation" });
  }
});

module.exports = router;
