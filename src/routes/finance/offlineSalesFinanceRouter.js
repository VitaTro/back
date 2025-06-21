const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");
const { validate } = require("../../middleware/validateMiddleware");
const offlineSaleValidationSchema = require("../../validation/offlineSalesJoi");

const Product = require("../../schemas/product");
const OfflineSale = require("../../schemas/finance/offlineSales");
const FinanceOverview = require("../../schemas/finance/financeOverview");
const Invoice = require("../../schemas/InvoiceSchema");
const generateInvoicePDFOffline = require("../../config/invoicePdfGeneratorOffline");

router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const offlineSales = await OfflineSale.find(filter).populate(
      "products.productId",
      "name photoUrl price"
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

router.post(
  "/",
  authenticateAdmin,
  validate(offlineSaleValidationSchema),
  async (req, res) => {
    try {
      const {
        orderId,
        products,
        totalAmount,
        paymentMethod,
        status,
        buyerType,
        buyerName,
        buyerAddress,
        buyerNIP,
      } = req.body;

      const validPaymentMethods = ["BLIK", "bank_transfer"];
      if (!validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({ error: "Invalid payment method" });
      }

      const offlineSaleProducts = await Promise.all(
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

      const newOfflineSale = await OfflineSale.create({
        orderId,
        products: offlineSaleProducts,
        totalAmount,
        paymentMethod,
        status: status || (paymentMethod !== "BLIK" ? "completed" : "pending"),
        saleDate: new Date(),
        buyerType,
        ...(buyerType === "przedsiębiorca" && {
          buyerName,
          buyerAddress,
          buyerNIP,
        }),
      });

      let invoice = null;

      if (newOfflineSale.status === "completed") {
        await FinanceOverview.updateOne(
          {},
          {
            $inc: { totalRevenue: newOfflineSale.totalAmount },
            $push: { completedOfflineSales: newOfflineSale._id },
          },
          { upsert: true }
        );

        const invoiceData = {
          invoiceType: "offline",
          totalAmount,
          paymentMethod,
          buyerType: buyerType || "anonim",
          issueDate: new Date(),
        };

        if (buyerType === "przedsiębiorca") {
          invoiceData.buyerName = buyerName;
          invoiceData.buyerAddress = buyerAddress;
          invoiceData.buyerNIP = buyerNIP;
        }

        invoice = new Invoice(invoiceData);
        await invoice.validate();

        const pdfPath = await generateInvoicePDFOffline(
          invoice,
          invoiceData.buyerType
        );
        invoice.filePath = pdfPath;
        await invoice.save();
      }

      res.status(201).json({
        message: "Offline sale recorded successfully",
        sale: newOfflineSale,
        invoice,
      });
    } catch (error) {
      console.error("🔥 Error recording offline sale:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to record offline sale" });
    }
  }
);

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

    await Promise.all(
      sale.products.map(async (product) => {
        await Product.updateOne(
          { _id: product.productId },
          { $inc: { stock: product.quantity } }
        );
      })
    );

    await FinanceOverview.updateOne(
      {},
      { $inc: { totalRevenue: -refundAmount } }
    );

    sale.status = "returned";
    sale.refundAmount = refundAmount;
    await sale.save();

    res.status(200).json({ message: "Sale returned successfully", sale });
  } catch (error) {
    console.error("🔥 Error processing return:", error);
    res.status(500).json({ error: "Failed to return sale" });
  }
});

module.exports = router;
