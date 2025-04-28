const express = require("express");
const router = express.Router();
const OnlineOrder = require("../schemas/finance/onlineOrders");
const OnlineSale = require("../schemas/finance/onlineSales");
const Product = require("../schemas/product");
const { validate } = require("../middleware/validateMiddleware");
const validateOnlineSale = require("../validation/onlineSalesJoi");
const validateOnlineOrder = require("../validation/onlineOrdersJoi");
router.get("/orders", async (req, res) => {
  try {
    const orders = await OnlineOrder.find()
      .populate("products.productId")
      .populate("userId");
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error in fetching online orders:", error);
    res.status(500).json({ error: "Failed to fetch online orders" });
  }
});

// Створити нове онлайн замовлення
router.post("/orders", validate(validateOnlineOrder), async (req, res) => {
  try {
    const { products, totalQuantity, totalPrice, paymentMethod, userId } =
      req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ error: "Product list cannot be empty." });
    }

    const newOrder = new OnlineOrder({
      products,
      totalQuantity,
      totalPrice,
      paymentMethod,
      userId,
      status: "new",
    });

    await newOrder.save();
    res
      .status(201)
      .json({ message: "Online order created successfully", order: newOrder });
  } catch (error) {
    console.error("Error in creating online order:", error);
    res.status(500).json({ error: "Failed to create online order" });
  }
});

// Отримати конкретне онлайн замовлення
router.get("/orders/:id", async (req, res) => {
  try {
    const order = await OnlineOrder.findById(req.params.id)
      .populate("products.productId")
      .populate("userId");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.status(200).json(order);
  } catch (error) {
    console.error("Error in fetching order:", error);
    res.status(500).json({ error: "Failed to fetch online order" });
  }
});

// Оновити статус онлайн замовлення
router.patch("/orders/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["new", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updatedOrder = await OnlineOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({
      message: "Online order updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error in updating order:", error);
    res.status(500).json({ error: "Failed to update online order" });
  }
});

// Отримати всі онлайн продажі
router.get("/sales", async (req, res) => {
  try {
    const sales = await OnlineSale.find()
      .populate({
        path: "products.productId",
        select: "name photoUrl",
      })
      .populate("processedBy");
    res.status(200).json(sales);
  } catch (error) {
    console.error("Error in fetching online sales:", error);
    res.status(500).json({ error: "Failed to fetch online sales" });
  }
});

// Додати новий запис про онлайн продаж
router.post("/sales", validate(validateOnlineSale), async (req, res) => {
  try {
    const { products, totalAmount, paymentMethod, processedBy } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ error: "Products list cannot be empty." });
    }

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
        salePrice: product.salePrice,
      });
    }

    const newSale = new OnlineSale({
      products: saleProducts,
      totalAmount,
      paymentMethod,
      processedBy,
    });

    await newSale.save();
    res
      .status(201)
      .json({ message: "Online sale recorded successfully", sale: newSale });
  } catch (error) {
    console.error("Error in recording online sale:", error);
    res.status(500).json({ error: "Failed to record online sale" });
  }
});

// Оновити інформацію про онлайн продаж
router.patch("/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const sale = await OnlineSale.findByIdAndUpdate(id, updatedData, {
      new: true,
    });
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    res.status(200).json({ message: "Online sale updated successfully", sale });
  } catch (error) {
    console.error("Error in updating online sale:", error);
    res.status(500).json({ error: "Failed to update online sale" });
  }
});
module.exports = router;
