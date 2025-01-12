const express = require("express");
const { payDue } = require("../controllers/payDue.controller");
const router = express.Router();

router.get("/payDue/:dueId/:verificationMethod", payDue);

module.exports = router;