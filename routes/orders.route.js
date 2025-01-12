const express = require("express");
const { orders } = require("../controllers/orders.controller");
const { orders1, printDetails } = require("../controllers/orders1.controller");
const router = express.Router();

router.get("/orders", orders);

router.get("/print-orders", orders1);

router.get("/printDetails", printDetails);

module.exports = router;
