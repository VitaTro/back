const Product = require("../schemas/product");

const searchController = async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword) {
      return res
        .status(400)
        .json({ message: 'The query parameter "keyword" is required' });
    }
    const regex = new RegExp(keyword, "i");
    const products = await Product.find({ title: { $regex: regex } });
    if (products.length === 0) {
      return res.status(404).json({ message: "Sorry! Product is not found" });
    }
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// module.exports = searchController;
