
const express = require("express");
const { shop_owner_product } = require("../controllers/shop-owner-products.controller");
const router = express.Router();

router.get("/shop/:id", shop_owner_product);

module.exports = router;