const express = require("express");
const {
  uploadBrandProduct, uploadBrandProductPost
} = require("../controllers/upload-brand-product.controller");
const router = express.Router();

router.get("/upload-brand-product", uploadBrandProduct);
router.post("/upload-brand-product", uploadBrandProductPost);

module.exports = router;
