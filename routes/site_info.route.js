const express = require("express");
const {
  aboutUs,
  policy,
  terms_and_condition,
  contact_us,
  brand_guidelines,
  notice,
} = require("../controllers/site_info.controller");
const router = express.Router();

router.get("/aboutUs", aboutUs);
router.get("/policy", policy);
router.get("/terms_and_condition", terms_and_condition);
router.get("/contact_us", contact_us);
router.get("/brand_guidelines", brand_guidelines);
router.get("/notice", notice);

module.exports = router;
