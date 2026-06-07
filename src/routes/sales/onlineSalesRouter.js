const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const OnlineSale = require("../../schemas/sales/onlineSales");
const OnlineOrder = require("../../schemas/orders/onlineOrders");
const Product = require("../../schemas/product");
const FinanceOverview = require("../../schemas/finance/financeOverview");
const { validate } = require("../../middleware/validateMiddleware");
const validateOnlineSale = require("../../validation/onlineSalesJoi");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");
const Invoice = require("../../schemas/accounting/InvoiceSchema");
const StockMovement = require("../../schemas/accounting/stockMovement");
const { calculateStock } = require("../../services/calculateStock");
const generateUniversalInvoice = require("../../services/generateUniversalInvoice");
const { calculateDiscount } = require("../../services/discountCalculator");
// 🔍 Отримати всі онлайн продажі
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const onlineSales = await OnlineSale.find()
      .populate({
        path: "products.productId",
        select: "name photoUrl",
      })
      .populate("processedBy");

    if (!onlineSales.length) {
      return res
        .status(200)
        .json({ message: "No online sales available", sales: [] });
    }
    console.log("✅ Online sales fetched:", onlineSales);
    res.status(200).json({ sales: onlineSales });
  } catch (error) {
    console.error("🔥 Error in fetching online sales:", error);
    res.status(500).json({ error: "Failed to fetch online sales" });
  }
});

router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const { onlineOrderId } = req.body;
    const order = await OnlineOrder.findById(onlineOrderId);

    if (!order) {
      return res.status(404).json({ error: "❌ Замовлення не знайдено" });
    }

    if (order.status !== "completed") {
      return res.status(400).json({ error: "🚫 Замовлення ще не завершено" });
    }

    const enrichedProducts = [];
    let totalAmount = 0;

    let discount = 0;
    let discountPercent = 0;
    let final = 0;
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
        throw new Error(`🧨 Немає руху товару: ${item.productId}`);
      }

      const stockLevel = await calculateStock(lastMovement.productIndex);
      if (stockLevel < item.quantity) {
        return res.status(400).json({
          error: `🚫 Недостатньо на складі: ${lastMovement.productName}`,
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
      const discountData = order.discount
        ? {
            discount: order.discount,
            discountPercent: order.discountPercent,
            final: order.finalPrice,
          }
        : calculateDiscount(totalAmount);
      discount = discountData.discount;
      discountPercent = discountData.discountPercent;
      final = discountData.final;
      enrichedProducts.push({
        productId: item.productId,
        index: lastMovement.productIndex,
        name: lastMovement.productName,
        quantity: item.quantity,
        salePrice: unitPrice,
        photoUrl: item.photoUrl || "",
      });

      // 🎯 Створюємо складський рух
      await StockMovement.create({
        productId: item.productId,
        productIndex: lastMovement.productIndex,
        productName: lastMovement.productName,
        quantity: item.quantity,
        type: "sale",
        unitSalePrice: unitPrice,
        price: unitPrice,
        relatedSaleId: onlineOrderId,
        saleSource: "OnlineSale",
        date: new Date(),
        note: "Списання при онлайн-продажу",
      });

      // 📦 Оновлюємо Product
      const productDoc = await Product.findById(item.productId);
      if (productDoc) {
        const newStock = await calculateStock(lastMovement.productIndex);
        productDoc.quantity = newStock;
        productDoc.currentStock = newStock;
        productDoc.inStock = newStock > 0;
        await productDoc.save();
      }
    }

    // 🧾 Створюємо OnlineSale
    const onlineSale = await OnlineSale.create({
      onlineOrderId,
      userId: order.userId,
      products: enrichedProducts,
      totalAmount,
      discount,
      discountPercent,
      shippingCost: order.shippingCost,

      finalPrice: final,
      paymentMethod: order.paymentMethod,
      status: "completed",
      deliveryDetails: `${order.deliveryType}`,
      saleDate: new Date(),
      buyerType: order.buyerType,
      buyerName: order.buyerName,
      buyerAddress: order.buyerAddress,
      buyerNIP: order.buyerNIP,
    });

    // 💰 Оновлюємо фінанси
    await FinanceOverview.updateOne(
      {},
      {
        $inc: { totalRevenue: final },
        $push: { completedOnlineSales: onlineSale._id },
      },
      { upsert: true },
    );

    // 📄 Генеруємо фактуру
    // const invoice = new Invoice({
    //   orderId: onlineOrderId,
    //   invoiceType: "online",
    //   totalAmount,
    //   paymentMethod: order.paymentMethod,
    //   buyerType: order.buyerType,
    //   buyerName: order.buyerName,
    //   buyerAddress: order.buyerAddress,
    //   buyerNIP: order.buyerNIP,
    // });

    // await invoice.save();
    // const invoice = await generateUniversalInvoice(order, {
    //   mode: "online",
    //   buyerType: order.buyerType,
    //   buyerName: order.buyerName,
    //   buyerAddress: order.buyerAddress,
    //   buyerNIP: order.buyerNIP,
    // });
    return res.status(201).json({
      message: "✅ Онлайн-продаж завершено",
      sale: onlineSale,
      // invoice: invoice,
    });
  } catch (error) {
    console.error("🔥 Помилка створення онлайн-продажу:", error);
    res.status(500).json({
      error: error.message || "❌ Не вдалося створити онлайн-продаж",
    });
  }
});

// 📌 Оновлення статусу онлайн-замовлення + автоматичне додавання у продажі
router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    console.log(
      `🛠 Updating online order ID: ${req.params.id} with status: ${req.body.status}`,
    );

    const { status, processedBy, paymentMethod } = req.body;
    const validStatuses = ["new", "completed", "cancelled", "returned"];

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
        const salePaymentMethod = paymentMethod || "BLIK";

        // ✅ `salePrice` встановлюється автоматично
        const saleProducts = existingOnlineOrder.products.map((product) => ({
          productId: product.productId,
          quantity: product.quantity,
          salePrice: product.salePrice || product.price || 0,
        }));

        const newOnlineSale = new OnlineSale({
          userId: existingOnlineOrder.userId,
          onlineOrderId: existingOnlineOrder._id,
          totalAmount: existingOnlineOrder.totalPrice,
          discount: existingOnlineOrder.discount,
          discountPercent: existingOnlineOrder.discountPercent,
          finalPrice: existingOnlineOrder.finalPrice,
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
    await FinanceOverview.updateOne(
      {},
      {
        $push: { completedOnlineOrders: existingOnlineOrder._id },
        $inc: { totalRevenue: existingOnlineOrder.finalPrice },
      },
      { upsert: true },
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

router.put("/:id/return", authenticateAdmin, async (req, res) => {
  try {
    const { returnedProducts, refundAmount } = req.body;
    const sale = await OnlineSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: "❌ Продаж не знайдено" });
    if (sale.status === "returned")
      return res
        .status(400)
        .json({ error: "⚠️ Продаж вже повернуто повністю" });

    let totalRefunded = 0;

    for (const product of sale.products) {
      const returnedItem = returnedProducts.find(
        (p) => p.productId === product.productId.toString(),
      );

      if (returnedItem) {
        if (returnedItem.quantity > product.quantity) {
          return res.status(400).json({
            error: `❌ Кількість повернених товарів перевищує куплену`,
          });
        }

        // 📦 Створюємо рух повернення на склад
        await StockMovement.create({
          productId: product.productId,
          productIndex: product.index,
          productName: product.name,
          quantity: returnedItem.quantity,
          type: "return",
          unitPurchasePrice: product.price,
          price: product.price,
          relatedSaleId: sale._id,
          saleSource: "OnlineSale",
          date: new Date(),
          note: "Повернення після онлайн-продажу",
        });

        // 💰 Облік суми повернення
        totalRefunded += returnedItem.quantity * product.price;
        product.quantity -= returnedItem.quantity;
      }
    }

    await FinanceOverview.updateOne(
      {},
      {
        $inc: {
          totalRevenue: -Math.min(
            totalRefunded,
            sale.finalPrice || sale.totalAmount,
          ),
        },
      },
    );

    sale.products = sale.products.filter((p) => p.quantity > 0);
    sale.returnedItems = returnedProducts;
    if (sale.products.length === 0) {
      sale.status = "returned";
    }

    await sale.save();

    res.status(200).json({ message: "✅ Товар повернуто", sale });
  } catch (error) {
    console.error("🔥 Error during return:", error);
    res.status(500).json({ error: "❌ Не вдалося обробити повернення" });
  }
});

// router.get("/invoices", authenticateAdmin, async (req, res) => {
//   try {
//     const invoices = await Invoice.find()
//       .sort({ issueDate: -1 })
//       .populate("userId", "fullName email") // якщо хочеш бачити юзера
//       .populate("orderId", "products totalPrice"); // якщо потрібно підтягнути замовлення

//     res.status(200).json(invoices);
//   } catch (error) {
//     console.error("❌ Failed to fetch invoices:", error);
//     res.status(500).json({ error: "Failed to fetch invoices" });
//   }
// });

module.exports = router;
