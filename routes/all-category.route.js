const express = require("express");
const { allCategory } = require("../controllers/all-category.controller");
const router = express.Router();

router.get("/all-category", allCategory);

module.exports = router;
