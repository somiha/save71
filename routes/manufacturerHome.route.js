const express = require("express");
const { manufacturerHome } = require("../controllers/manufacturerHome.controller");
const router = express.Router();

router.get("/manufacturerHome", manufacturerHome);

module.exports = router;
