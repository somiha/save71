const express = require("express");
const {
    s_cookies,
    d_cookies,
    getCountryCode,
    getCurrencyCode,
    notificationSeen,
} = require("../controllers/cookies.controller");
const router = express.Router();

router.post("/setCookie", s_cookies);
router.post("/__sNot", notificationSeen);
router.get("/d_cookies", d_cookies);
router.get("/__gCCo", getCountryCode);
router.get("/__gCCor", getCurrencyCode);


module.exports = router;