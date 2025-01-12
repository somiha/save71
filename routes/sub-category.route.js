const express = require("express");
const { subCat } = require("../controllers/sub-category.controller");
const router = express.Router();

router.get("/sub-category/:sub_cat_id", subCat);

module.exports = router;
