const express = require("express");
const { uploadProduct } = require("../controllers/upload-product.controller");
const router = express.Router();

router.get("/upload-product", uploadProduct);

module.exports = router;
