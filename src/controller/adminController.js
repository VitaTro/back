// const User = require("../schemas/user");
// const Product = require("../schemas/product");

// const checkAdmin = async (req, res) => {
//   try {
//     const admins = await User.find({ role: "admin" });
//     const isFirstAdmin = admins.length === 0;
//     res.json({ isFirstAdmin });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to check admin status." });
//   }
// };
// const manageUsers = (req, res) => {
//   res.json({ message: "User management route (to be implemented)." });
// };

// const manageProducts = (req, res) => {
//   res.json({ message: "Product management route (to be implemented)." });
// };
// const getDashboard = async (req, res) => {
//   try {
//     if (req.user.role !== "admin") {
//       return res.status(403).json({ message: "Access denied. Admins only." });
//     }
//     const stats = {
//       totalUsers: await User.countDocuments(),
//       totalProducts: await Product.countDocuments(),
//     };
//     res.json({ message: "Welcome to the dashboard!", stats });
//   } catch (error) {
//     res.status(500).json({ message: "Failed to load dashboard data." });
//   }
// };

// module.exports = { checkAdmin, getDashboard, manageProducts, manageUsers };
