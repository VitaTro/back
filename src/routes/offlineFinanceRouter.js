const express = require("express");
const router = express.Router();
const OfflineOrder = require("../schemas/finance/offlineOrders");
const OfflineSale = require("../schemas/finance/offlineSales");
const Product = require("../schemas/product");
const { validate } = require("../middleware/validateMiddleware");
const validateOfflineOrder = require("../validation/offlineOrdersJoi");
const validateOfflineSale = require("../validation/offlineSalesJoi");

// Отримати всі офлайн-замовлення
router.get("/orders", async (req, res) => {
  try {
    const orders = await OfflineOrder.find()
      .populate({
        path: "products.productId",
        select: "name photoUrl",
      })
      .populate("processedBy");
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch offline orders" });
  }
});

// Створити нове офлайн-замовлення
router.post("/orders", validate(validateOfflineOrder), async (req, res) => {
  try {
    const { products, totalPrice, paymentMethod, processedBy, saleLocation } =
      req.body;

    const orderProducts = [];
    for (const product of products) {
      const dbProduct = await Product.findById(product.productId);
      if (!dbProduct || dbProduct.quantity < product.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for product: ${
            dbProduct?.name || product.productId
          }`,
        });
      }
      dbProduct.quantity -= product.quantity;
      await dbProduct.save();

      orderProducts.push({
        productId: dbProduct._id,
        name: dbProduct.name,
        price: dbProduct.price,
        quantity: product.quantity,
      });
    }

    const newOrder = new OfflineOrder({
      products: orderProducts,
      totalPrice,
      paymentMethod,
      processedBy,
      saleLocation,
      status: "pending",
    });

    await newOrder.save();
    res
      .status(201)
      .json({ message: "Offline order created successfully", order: newOrder });
  } catch (error) {
    res.status(500).json({ error: "Failed to create offline order" });
  }
});
// Отримати конкретне офлайн-замовлення
router.get("/orders/:id", async (req, res) => {
  try {
    const order = await OfflineOrder.findById(req.params.id)
      .populate("products.productId")
      .populate("processedBy");
    if (!order) {
      return res.status(404).json({ error: "Offline order not found" });
    }
    res.status(200).json(order);
  } catch (error) {
    console.error("Error fetching offline order:", error);
    res.status(500).json({ error: "Failed to fetch offline order" });
  }
});

// Оновити статус офлайн-замовлення
router.patch("/orders/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updatedOrder = await OfflineOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updatedOrder) {
      return res.status(404).json({ error: "Offline order not found" });
    }

    res.status(200).json({
      message: "Offline order updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update offline order" });
  }
});

// Отримати всі офлайн-продажі
router.get("/sales", async (req, res) => {
  try {
    const sales = await OfflineSale.find()
      .populate("products.productId")
      .populate("processedBy");
    res.status(200).json(sales);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch offline sales" });
  }
});

// Створити новий офлайн-продаж
router.post("/sales", validate(validateOfflineSale), async (req, res) => {
  try {
    const { products, totalAmount, paymentMethod, processedBy, saleLocation } =
      req.body;

    const saleProducts = [];
    for (const product of products) {
      const dbProduct = await Product.findById(product.productId);
      if (!dbProduct || dbProduct.quantity < product.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for product: ${
            dbProduct?.name || product.productId
          }`,
        });
      }
      dbProduct.quantity -= product.quantity;
      await dbProduct.save();

      saleProducts.push({
        productId: dbProduct._id,
        quantity: product.quantity,
        price: dbProduct.price,
      });
    }

    const newSale = new OfflineSale({
      products: saleProducts,
      totalAmount,
      paymentMethod,
      processedBy,
      saleLocation,
    });

    await newSale.save();
    res
      .status(201)
      .json({ message: "Offline sale recorded successfully", sale: newSale });
  } catch (error) {
    res.status(500).json({ error: "Failed to record offline sale" });
  }
});

// Оновити інформацію про офлайн-продаж
router.patch("/sales/:id", async (req, res) => {
  try {
    const updatedData = req.body;

    const sale = await OfflineSale.findByIdAndUpdate(
      req.params.id,
      updatedData,
      {
        new: true,
      }
    );
    if (!sale) {
      return res.status(404).json({ error: "Offline sale not found" });
    }

    res
      .status(200)
      .json({ message: "Offline sale updated successfully", sale });
  } catch (error) {
    res.status(500).json({ error: "Failed to update offline sale" });
  }
});

module.exports = router;
