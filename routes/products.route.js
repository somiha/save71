const express = require("express");
const {
  products,
  del_product,
  unpublish_product,
  publish_product,
} = require("../controllers/products.controller");
const { addNote, addCancelNote } = require("../controllers/notes");
const router = express.Router();

router.get("/products", products);
router.get("/del_product/:id", del_product);
router.get("/unpublish_product/:product_id", unpublish_product);
router.get("/publish_product/:product_id", publish_product);

router.post("/add-note", addNote);

router.post("/add-cancel-note", addCancelNote);
module.exports = router;
