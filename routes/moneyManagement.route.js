const express = require("express");
const {
  addMoney,
  withDraw,
  withDrawReq,
  addMoneyReq,
} = require("../controllers/moneyManagement.controller");
const moneyManagement = express.Router();
const isLogged = require("../middlewares/isLogin");

moneyManagement.post("/addMoney", addMoneyReq);
moneyManagement.post("/withDraw", withDrawReq);
moneyManagement.get("/addMoneyDone/:status/:transaction_id", addMoney);
moneyManagement.get("/withDrawConfirm/:status/:transaction_id", withDraw); // for admin panel
// to-do: change the money request status to 'confirmed' and update the shop balance

module.exports = moneyManagement;
