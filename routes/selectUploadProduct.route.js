const express = require("express");
const { selectUploadProduct } = require("../controllers/selectUploadProduct.controller");
const router = express.Router();

router.get("/selectUploadProduct/:extraCatId", selectUploadProduct);

module.exports = router;