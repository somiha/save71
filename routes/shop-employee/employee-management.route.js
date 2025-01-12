const express = require("express");
const router = express.Router();
const mult_upload = require("../../config/multer_product.config");

const {
  getAddEmplyee,
  myEmployees,
  enableOrDisableEmployee,
  addEmployee,
  getEditEmployee,
  updateEmployee,
  getEmployeeLogin,
  employeeLogin,
  getEmployeeDashboard,
  products,
  uploadOwnProduct,
  uploadOwnProductPost,
  unpublish_product,
  publish_product,
  edit_product,
  edit_productPost,
  edit_branded_productPost,
  delProductImage,
  changeFeatured,
  uploadBrandProduct,
  uploadBrandProductPost,
  selectUploadProduct,
  del_product,
  orders,
  orderDetails,
  order_status,
  order_status_complete,
  purchase,
  cart_product,
  addToCartBySeller,
  updateUserOrder,
  printDetails,
  orders1,
  updatePassword,
} = require("../../controllers/shop-employee/employeeController");

const {
  getFaq,
  addFaq,
  updateFaq,
} = require("../../controllers/shop-employee/employeeFAQ");

router.get("/add-employee", getAddEmplyee);
router.post("/add-employee", addEmployee);
router.get("/employees", myEmployees);
router.get("/enableOrDisableEmployee", enableOrDisableEmployee);

router.get("/edit-employee/:id", getEditEmployee);
router.post(
  "/update-employee",
  mult_upload.fields([{ name: "image", maxCount: 1 }]),
  updateEmployee
);

router.post(
  "/update-employee-password",

  updatePassword
);

router.get("/employee-login", getEmployeeLogin);
router.post("/employee-login", employeeLogin);
router.get("/employee-dashboard", getEmployeeDashboard);

router.get("/products-emp", products);
router.get("/upload-own-product-emp", uploadOwnProduct);
router.post("/upload-own-product-emp", uploadOwnProductPost);

router.get("/getFaq-emp/:product_id", getFaq);
router.post("/addFaq-emp/:product_id", addFaq);
router.post("/updateFaq/:faq_id", updateFaq);

router.get("/unpublish_product-emp/:product_id", unpublish_product);
router.get("/publish_product-emp/:product_id", publish_product);

router.get("/edit_product-emp/:id", edit_product);
router.post("/edit_product-emp/:id", edit_productPost);

router.post("/delProductImage-emp/:delID", delProductImage);
router.post("/featuredImage-emp/:productId/:newId", changeFeatured);
router.post("/edit_branded_product-emp/:id", edit_branded_productPost);

router.get("/upload-brand-product-emp", uploadBrandProduct);
router.post("/upload-brand-product-emp", uploadBrandProductPost);

router.get("/selectUploadProduct-emp/:extraCatId", selectUploadProduct);
router.get("/del_product-emp/:id", del_product);

router.get("/orders-emp", orders);
router.get("/emp-order-details/:id", orderDetails);
router.get("/emp-order-details/:id/:status", order_status);
router.get(
  "/emp-order-details/:id/:status/:ref_shop_id/:seller_id",
  order_status_complete
);

router.get("/emp-cart_product/:id/:userId/:orderId", cart_product);

router.get(
  "/emp-addToCartBySeller/:order_id/:user_id/:product_id/:seller_id",
  addToCartBySeller
);

router.get("/purchase-emp", purchase);

router.post("/emp-update-user-order", updateUserOrder);

router.get("/emp-printDetails", printDetails);

router.get("/emp-print-orders", orders1);

module.exports = router;
