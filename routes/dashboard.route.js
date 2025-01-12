const express = require("express");
const { dashboard } = require("../controllers/dashboard.controller");
const router = express.Router();

router.get("/dashboard", dashboard);

module.exports = router;
