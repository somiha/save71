const express = require("express");
const Router = express.Router();

const routes = [
  require("./shop-employee/employee-management.route"),
  require("./home.route"),
  require("./all-category.route"),
  require("./sub-category.route"),
  require("./all-extra-category.route"),
  require("./area-shop.route"),
  require("./product-details.route"),
  require("./upload-product.route"),
  require("./upload-brand-product.route"),
  require("./upload-own-product.route"),
  require("./dashboard.route"),
  require("./balance.route"),
  require("./favourite-products.route"),
  require("./order-details.route"),
  require("./orders.route"),
  require("./products.route"),
  require("./settings.route"),
  require("./login.route"),
  require("./registration.route"),
  require("./cart.route"),
  require("./shop-owner-products.route"),
  require("./edit-product.route"),
  require("./all-products.route"),
  require("./user-dashboard/dashboard.route"),
  require("./user-dashboard/order.route"),
  require("./search.route"),
  require("./rating.route"),
  require("./faq.route"),
  require("./myCustomers.route"),
  require("./selectUploadProduct.route"),
  require("./payDue.route"),
  require("./manufacturerHome.route"),
  require("./moneyManagement.route"),
  require("./nearest-product.route"),
  require("./popular-product.route"),
  require("./emailVerification.route"),
  require("./cookies.route"),
  require("./site_info.route"),
];

routes.forEach((route) => Router.use(route));

module.exports = Router;
