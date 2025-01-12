const express = require("express");
const { settings, settings_personal_info, settings_change_pass, storeInfoEdit, picEdit, upShopLoc, updateBankInfo,
    updateBankInfoOTPApi,
    settings_personal_info_done,
} = require("../controllers/settings.controller");
const router = express.Router();

router.get("/settings", settings);
router.post("/personalInfo", settings_personal_info);
router.post("/personalInfoOTPApi", settings_personal_info_done);
router.post("/changePass", settings_change_pass);
router.post("/storeInfoEdit", storeInfoEdit);
router.post("/editPic", picEdit);
router.post("/updateStoreLocation", upShopLoc);
router.post("/updateBankInfo", updateBankInfo);
router.post("/updateBankInfoOTPApi", updateBankInfoOTPApi);

module.exports = router;
