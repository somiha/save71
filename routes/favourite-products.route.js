const express = require("express");
const {
  favouriteProducts,
} = require("../controllers/favourite-products.controller");
const router = express.Router();

router.get("/favourite-products", favouriteProducts);

module.exports = router;
