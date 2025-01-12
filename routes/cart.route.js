const express = require("express");
const { addToCart, delCart, updateCart, placeOrder, placeOrderArea, cancelOrder, deliveryAddress } = require("../controllers/cart.controller");
const router = express.Router();

router.get("/cart/:seller_id/:product_id", addToCart);
router.get("/cart_del/:order_details_id", delCart);
router.get("/placeOrder", placeOrder);
router.get("/placeOrderArea", placeOrderArea);
router.get("/cancelOrder", cancelOrder);
router.post("/update_cart", updateCart);
router.post("/deliveryAddress", deliveryAddress);

module.exports = router;