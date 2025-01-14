const express = require("express");
const {
  balance,
  filter,
  getTableInfo,
  getTableInfoDue,
  getTableInfoWithdraw,
} = require("../controllers/balance.controller");
const router = express.Router();

router.get("/balance", balance);
router.post("/applyCustomFilter", filter);
router.post("/getTableInfo", getTableInfo);
router.post("/getTableInfoDue", getTableInfoDue);
router.post("/getTableInfoWithdraw", getTableInfoWithdraw);

module.exports = router;
