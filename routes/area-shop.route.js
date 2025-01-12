const express = require("express");
const { areaShop } = require("../controllers/area-shop.controller");
const router = express.Router();

router.get("/area-shop", areaShop);

module.exports = router;
