const express = require("express");
const {
    addFaq, getFaq, updateFaq, delFaq
} = require("../controllers/faq.controller");
const router = express.Router();

router.post("/addFaq/:product_id", addFaq);
router.get("/getFaq/:product_id", getFaq);
router.post("/updateFaq/:faq_id", updateFaq);
router.get("/delFaq/:faq_id", delFaq);

module.exports = router;
