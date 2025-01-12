const express = require("express");
const { getPopularProducts, getPopularManufacturer } = require("../controllers/popular-product.controller");
const popularProductRouter = express.Router();
const isLogged = require("../middlewares/isLogin");

popularProductRouter.get("/popular-products", isLogged, getPopularProducts);
popularProductRouter.get("/popular-manufacturer", isLogged, getPopularManufacturer);

module.exports = popularProductRouter;