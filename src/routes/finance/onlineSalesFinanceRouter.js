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

router.post("/", validate(validateOnlineSale), async (req, res) => {
  try {
    console.log("➡️ Створюємо новий онлайн-продаж...");

    const { products, totalAmount, paymentMethod, status } = req.body;
    const onlineSaleProducts = [];

    for (const product of products) {
      const dbProduct = await Product.findById(product.productId);
      if (!dbProduct || dbProduct.stock < product.quantity) {
        return res.status(400).json({
          error: `❌ Недостатня кількість товару: ${
            dbProduct?.name || product.productId
          }`,
        });
      }
      dbProduct.stock -= product.quantity;
      await dbProduct.save();

      onlineSaleProducts.push({
        productId: dbProduct._id,
        quantity: product.quantity,
        salePrice: product.salePrice || dbProduct.price || 0,
      });
    }

    const newOnlineSale = new OnlineSale({
      products: onlineSaleProducts,
      totalAmount,
      paymentMethod,
      status: status || "received",
      saleDate: new Date(),
    });

    await newOnlineSale.save();
    console.log("✅ Онлайн-продаж створено успішно!");

    res.status(201).json({
      message: "Продаж записано успішно",
      sale: newOnlineSale,
    });
  } catch (error) {
    console.error("🔥 Помилка створення онлайн-продажу:", error);
    res.status(500).json({ error: "Не вдалося записати онлайн-продаж" });
  }
});

// 📌 Оновлення статусу онлайн-замовлення + автоматичне додавання у продажі
router.patch("/:id", async (req, res) => {
  try {
    console.log(
      `🛠 Updating online order ID: ${req.params.id} with status: ${req.body.status}`
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

router.put("/:id/return", async (req, res) => {
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
        (p) => p.productId === product.productId.toString()
      );

      if (returnedItem) {
        if (returnedItem.quantity > product.quantity) {
          return res.status(400).json({
            error: `❌ Кількість повернених товарів перевищує куплену!`,
          });
        }

        // 🔄 Оновлюємо склад
        await Product.updateOne(
          { _id: product.productId },
          { $inc: { stock: returnedItem.quantity } }
        );

        // 💰 Оновлення загальної суми повернення
        totalRefunded += returnedItem.quantity * product.salePrice;
        product.quantity -= returnedItem.quantity;
      }
    }

    // 💵 Оновлення фінансів
    await FinanceOverview.updateOne(
      {},
      { $inc: { totalRevenue: -totalRefunded } }
    );

    // 📌 Видаляємо товари, які повністю повернули
    sale.products = sale.products.filter((p) => p.quantity > 0);
    sale.returnedItems = returnedProducts;

    if (sale.products.length === 0) {
      sale.status = "returned"; // Якщо всі товари повернені, змінюємо статус
    }

    await sale.save();

    res.status(200).json({ message: "✅ Товар частково повернено", sale });
  } catch (error) {
    console.error("🔥 Помилка повернення:", error);
    res.status(500).json({ error: "❌ Не вдалося повернути товар" });
  }
});

module.exports = router;
