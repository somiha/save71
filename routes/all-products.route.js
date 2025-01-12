const express = require("express");
const { allProducts } = require("../controllers/all-products.controller");
const router = express.Router();

router.get("/product/:extraId", allProducts);

module.exports = router;
