const express = require("express");
const {
  uploadOwnProduct, uploadOwnProductPost, addProductFromStore
} = require("../controllers/upload-own-product.controller");
const router = express.Router();

router.get("/upload-own-product", uploadOwnProduct);
router.post("/upload-own-product", uploadOwnProductPost);
router.post("/addProductFromStore", addProductFromStore);

module.exports = router;
