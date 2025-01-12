const express = require("express");
const { myCustomers } = require("../controllers/myCustomers.controller");
const router = express.Router();

router.get("/myCustomers", myCustomers);

module.exports = router;
