const express = require("express");
const { allExtraCategory, apiAllExtraCategory } = require("../controllers/all-extra-category.controller");
const router = express.Router();

router.get("/all-extra-category", allExtraCategory);
router.get("/api/all-extra-category", apiAllExtraCategory);

module.exports = router;
