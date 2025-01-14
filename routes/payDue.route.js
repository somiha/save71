const express = require("express");
const { payDue, paydue_v2 } = require("../controllers/payDue.controller");
const router = express.Router();

router.get("/payDue/:dueId/:verificationMethod", paydue_v2);

module.exports = router;
