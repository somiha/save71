const express = require("express");
const { user_dashboard } = require("../../controllers/user-dashboard/dashboard.controller");
const router = express.Router();

router.get("/user_dashboard", user_dashboard);

module.exports = router;
