const express = require("express");
const { productDetails } = require("../controllers/product-details.controller");
const router = express.Router();

router.get("/product-details/:pName/:id", productDetails);

module.exports = router;
