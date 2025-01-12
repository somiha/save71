const express = require("express");
const {
  orderDetails,
  order_delete,
  order_status,
  stock_out,
  order_status_complete,
  delivery_charge,
  updateOrder,
  updateUserOrder,
  updateUserOrderDeliveryChange,
  deleteOrderItem,
  order_status_complete_v2,
} = require("../controllers/order-details.controller");

const {
  cart_product,
  addToCartBySeller,
} = require("../controllers/add-product.controller");
const router = express.Router();

router.get("/order_details/:id", orderDetails);
router.get("/order_details/:id/:status", order_status);
router.get(
  "/order_details/:id/:status/:ref_shop_id/:seller_id",
  order_status_complete
);
router.get("/order_delete/:id", order_delete);
router.get("/stock_out/:order_id/:id/:pID", stock_out);
router.post("/deleteOrderItem/:id", deleteOrderItem);
router.get("/cart_product/:id/:userId/:orderId", cart_product);
router.get(
  "/addToCartBySeller/:order_id/:user_id/:product_id/:seller_id",
  addToCartBySeller
);
router.post("/deliveryCharge/:oID", delivery_charge);
router.post(
  "/updateOrder/:order_details_id/:extra_cat_id/:is_seller",
  updateOrder
);
router.post("/update-user-order", updateUserOrder);
router.post(
  "/update-user-order-delivery-change",
  updateUserOrderDeliveryChange
);

router.get(
  "/order-status-complete/:id/:status/:ref_shop_id/:seller_id",
  order_status_complete_v2
);

module.exports = router;
