const express = require("express");
const { edit_product, edit_productPost, edit_branded_productPost, delProductImage, changeFeatured } = require("../controllers/edit-product.controller");
const router = express.Router();

router.get("/edit_product/:id", edit_product);
router.post("/edit_product/:id", edit_productPost);
router.post("/edit_branded_product/:id", edit_branded_productPost);
router.post("/delProductImage/:delID", delProductImage);
router.post("/featuredImage/:productId/:newId", changeFeatured);

module.exports = router;