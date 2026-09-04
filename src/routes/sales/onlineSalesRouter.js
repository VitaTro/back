const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const OnlineSale = require("../../schemas/sales/onlineSales");
const OnlineOrder = require("../../schemas/orders/onlineOrders");
const Product = require("../../schemas/product");
const FinanceOverview = require("../../schemas/finance/financeOverview");
const StockMovement = require("../../schemas/accounting/stockMovement");
const { calculateStock } = require("../../services/calculateStock");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const sales = await OnlineSale.find()
      .populate("userId", "email name")
      .populate("products.productId", "name photoUrl")
      .sort({ createdAt: -1 });

    res.status(200).json({ sales });
  } catch (error) {
    console.error("🔥 Error fetching sales:", error);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

// router.post("/", authenticateAdmin, async (req, res) => {
//   try {
//     const { onlineOrderId } = req.body;

//     const order = await OnlineOrder.findById(onlineOrderId);
//     if (!order) {
//       return res.status(404).json({ error: "Order not found" });
//     }

//     if (order.status !== "completed") {
//       return res.status(400).json({
//         error: "Order must be completed before converting to sale",
//       });
//     }

//     const saleProducts = [];
//     let totalAmount = 0;

//     for (const item of order.products) {
//       const product = await Product.findById(item.productId);
//       if (!product || !product.index) {
//         return res.status(400).json({
//           error: `Product data missing for ${item.productId}`,
//         });
//       }

//       const stockLevel = await calculateStock(product.index);
//       if (stockLevel < item.quantity) {
//         return res.status(400).json({
//           error: `Not enough stock for ${product.name}`,
//         });
//       }

//       saleProducts.push({
//         productId: item.productId,
//         index: product.index,
//         name: product.name,
//         photoUrl: product.photoUrl || "",
//         quantity: item.quantity,
//         salePrice: item.price,
//         size: item.size || null,
//         sku: item.sku || null,
//       });

//       totalAmount += item.price * item.quantity;
//     }

//     const newSale = await OnlineSale.create({
//       userId: order.userId,
//       onlineOrderId: order._id,
//       products: saleProducts,
//       totalAmount,
//       shippingCost: order.shippingCost,
//       finalPrice: totalAmount + order.shippingCost,
//       paymentMethod: "tpay",
//       status: "completed",
//       saleDate: new Date(),
//     });

//     for (const item of saleProducts) {
//       await StockMovement.create({
//         productId: item.productId,
//         productIndex: item.index,
//         productName: item.name,
//         quantity: item.quantity,
//         type: "sale",
//         unitSalePrice: item.salePrice,
//         price: item.salePrice,
//         relatedSaleId: newSale._id,
//         saleSource: "OnlineSale",
//         date: new Date(),
//         note: "Списання при онлайн-продажу",
//       });

//       const newStock = await calculateStock(item.index);
//       await Product.findByIdAndUpdate(item.productId, {
//         quantity: newStock,
//         currentStock: newStock,
//         inStock: newStock > 0,
//       });
//     }

//     await FinanceOverview.updateOne(
//       {},
//       {
//         $inc: { totalRevenue: newSale.finalPrice },
//         $push: { completedSales: newSale._id },
//       },
//       { upsert: true },
//     );

//     await order.save();

//     res.status(201).json({
//       message: "Продаж успішно проведено!",
//       sale: newSale,
//     });
//   } catch (error) {
//     console.error("🔥 Error creating sale:", error);
//     res.status(500).json({ error: "Failed to create sale" });
//   }
// });

/* ============================================================
   📌 POST — Створити продаж вручну (createSale)
============================================================ */
router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const { onlineOrderId } = req.body;

    const order = await OnlineOrder.findById(onlineOrderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "completed") {
      return res.status(400).json({
        error: "Order must be completed before converting to sale",
      });
    }

    const saleProducts = [];
    let totalAmount = 0;

    for (const item of order.products) {
      const productDoc = await Product.findById(item.productId);

      if (!productDoc) {
        return res.status(400).json({
          error: `Product not found: ${item.productId}`,
        });
      }

      const isHandmade = productDoc.category === "handmade";

      let index = productDoc.index;
      let name = productDoc.name;
      let unitPrice = item.price;

      if (isHandmade) {
        // 🔥 Handmade: перевіряємо склад тільки через Product
        if (productDoc.currentStock < item.quantity) {
          return res.status(400).json({
            error: `Not enough stock for ${productDoc.name}`,
          });
        }

      } else {
        // 🔥 Звичайний товар: перевіряємо через StockMovement
        const lastMovement = await StockMovement.findOne({
          productId: item.productId,
          type: { $in: ["sale", "purchase"] },
        }).sort({ date: -1 });

        if (!lastMovement) {
          return res.status(400).json({
            error: `No stock movement found for ${item.productId}`,
          });
        }

        const stockLevel = await calculateStock(lastMovement.productIndex);
        if (stockLevel < item.quantity) {
          return res.status(400).json({
            error: `Not enough stock for ${lastMovement.productName}`,
          });
        }

        index = lastMovement.productIndex;
        name = lastMovement.productName;
        unitPrice =
          lastMovement.unitSalePrice ||
          productDoc.lastRetailPrice ||
          lastMovement.price ||
          lastMovement.unitPurchasePrice ||
          item.price ||
          0;
      }

      saleProducts.push({
        productId: item.productId,
        index,
        name,
        photoUrl: productDoc.photoUrl || "",
        quantity: item.quantity,
        salePrice: unitPrice,
        size: item.size || null,
        sku: item.sku || null,
      });

      totalAmount += unitPrice * item.quantity;
    }

    const newSale = await OnlineSale.create({
      userId: order.userId,
      onlineOrderId: order._id,
      products: saleProducts,
      totalAmount,
      shippingCost: order.shippingCost,
      finalPrice: totalAmount + order.shippingCost,
      paymentMethod: order.paymentMethod || "tpay",
      status: "completed",
      saleDate: new Date(),
    });

    // 📦 Списання складу
    for (const item of saleProducts) {
      const productDoc = await Product.findById(item.productId);

      if (productDoc.category === "handmade") {
        // 🔥 Handmade: списуємо склад через Product
        productDoc.currentStock -= item.quantity;
        productDoc.quantity = productDoc.currentStock;
        productDoc.inStock = productDoc.currentStock > 0;
        await productDoc.save();

      } else {
        // 🔥 Звичайний товар: створюємо StockMovement
        await StockMovement.create({
          productId: item.productId,
          productIndex: item.index,
          productName: item.name,
          quantity: item.quantity,
          type: "sale",
          unitSalePrice: item.salePrice,
          price: item.salePrice,
          relatedSaleId: newSale._id,
          saleSource: "OnlineSale",
          date: newSale.saleDate,
          note: "Списання при онлайн-продажу",
        });

        const newStock = await calculateStock(item.index);
        await Product.findByIdAndUpdate(item.productId, {
          quantity: newStock,
          currentStock: newStock,
          inStock: newStock > 0,
        });
      }
    }

    // 💰 Оновлюємо фінанси
    await FinanceOverview.updateOne(
      {},
      {
        $inc: { totalRevenue: newSale.finalPrice },
        $push: { completedSales: newSale._id },
      },
      { upsert: true },
    );

    order.status = "sold";
    await order.save();

    res.status(201).json({
      message: "Продаж успішно проведено!",
      sale: newSale,
    });

  } catch (error) {
    console.error("🔥 Error creating sale:", error);
    res.status(500).json({ error: "Failed to create sale" });
  }
});

router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const sale = await OnlineSale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    sale.status = status;
    await sale.save();

    res.status(200).json({ message: "Sale updated", sale });
  } catch (error) {
    console.error("🔥 Error updating sale:", error);
    res.status(500).json({ error: "Failed to update sale" });
  }
});

/* ============================================================
   📌 PUT — Повернення товару
============================================================ */
// router.put("/:id/return", authenticateAdmin, async (req, res) => {
//   try {
//     const { returnedProducts } = req.body;

//     const sale = await OnlineSale.findById(req.params.id);
//     if (!sale) {
//       return res.status(404).json({ error: "Sale not found" });
//     }

//     let totalRefund = 0;

//     for (const returned of returnedProducts) {
//       const product = sale.products.find(
//         (p) => p.productId.toString() === returned.productId,
//       );

//       if (!product) continue;

//       if (returned.quantity > product.quantity) {
//         return res.status(400).json({
//           error: "Returned quantity exceeds sold quantity",
//         });
//       }

//       await StockMovement.create({
//         productId: product.productId,
//         productIndex: product.index,
//         productName: product.name,
//         quantity: returned.quantity,
//         type: "return",
//         unitPurchasePrice: product.salePrice,
//         price: product.salePrice,
//         relatedSaleId: sale._id,
//         saleSource: "OnlineSale",
//         date: new Date(),
//         note: "Повернення після онлайн-продажу",
//       });

//       totalRefund += returned.quantity * product.salePrice;
//       product.quantity -= returned.quantity;
//     }

//     sale.products = sale.products.filter((p) => p.quantity > 0);
//     if (sale.products.length === 0) sale.status = "returned";

//     await sale.save();

//     await FinanceOverview.updateOne(
//       {},
//       { $inc: { totalRevenue: -totalRefund } },
//     );

//     res.status(200).json({ message: "Return processed", sale });
//   } catch (error) {
//     console.error("🔥 Error processing return:", error);
//     res.status(500).json({ error: "Failed to process return" });
//   }
// });
/* ============================================================
   📌 PUT — Повернення товару (OnlineSale)
============================================================ */
router.put("/:id/return", authenticateAdmin, async (req, res) => {
  try {
    const { returnedProducts } = req.body;

    if (!returnedProducts || returnedProducts.length === 0) {
      return res.status(400).json({ error: "No returned products specified" });
    }

    const sale = await OnlineSale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    let totalRefund = 0;

    for (const returned of returnedProducts) {
      const productInSale = sale.products.find(
        (p) => p.productId.toString() === returned.productId
      );

      if (!productInSale) continue;

      if (returned.quantity > productInSale.quantity) {
        return res.status(400).json({
          error: "Returned quantity exceeds sold quantity",
        });
      }

      const productDoc = await Product.findById(returned.productId);
      if (!productDoc) continue;

      const isHandmade = productDoc.category === "handmade";

      if (isHandmade) {
        // 🟢 Handmade: повернення через Product
        productDoc.currentStock += returned.quantity;
        productDoc.quantity = productDoc.currentStock;
        productDoc.inStock = productDoc.currentStock > 0;
        await productDoc.save();

      } else {
        // 🔵 Звичайний товар: повернення через StockMovement
        await StockMovement.create({
          productId: productInSale.productId,
          productIndex: productInSale.index,
          productName: productInSale.name,
          quantity: returned.quantity,
          type: "return",
          unitPurchasePrice: productInSale.salePrice,
          price: productInSale.salePrice,
          relatedSaleId: sale._id,
          saleSource: "OnlineSale",
          date: new Date(),
          note: "Повернення після онлайн-продажу",
        });

        const newStock = await calculateStock(productInSale.index);
        productDoc.currentStock = newStock;
        productDoc.quantity = newStock;
        productDoc.inStock = newStock > 0;
        await productDoc.save();
      }

      // 💰 Рахуємо суму повернення
      totalRefund += returned.quantity * productInSale.salePrice;

      // 🔄 Оновлюємо кількість у продажі
      productInSale.quantity -= returned.quantity;
    }

    // 🔄 Видаляємо товари з продажу, якщо їх кількість стала 0
    sale.products = sale.products.filter((p) => p.quantity > 0);

    if (sale.products.length === 0) {
      sale.status = "returned";
    }

    await sale.save();

    // 💰 Оновлюємо фінанси
    await FinanceOverview.updateOne(
      {},
      { $inc: { totalRevenue: -totalRefund } }
    );

    res.status(200).json({
      message: "Return processed successfully",
      sale,
    });

  } catch (error) {
    console.error("🔥 Error processing return:", error);
    res.status(500).json({ error: "Failed to process return" });
  }
});

module.exports = router;
