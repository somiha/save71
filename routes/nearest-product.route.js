const express = require("express");
const { getNearestProducts, getNearestManufacturer } = require("../controllers/nearest-product.controller");
const nearestProductRouter = express.Router();
const isLogged = require("../middlewares/isLogin");

nearestProductRouter.get("/nearest-products", isLogged, getNearestProducts);
nearestProductRouter.get("/nearest-manufacturer", isLogged, getNearestManufacturer);

module.exports = nearestProductRouter;