const express = require("express");
const {
  emailVerification,
  emailVerificationPost,
  emailVerificationRequest,
  emailVerificationRequestAPI,
  emailVerificationPostAPI,
  resendOtp,
  resendOtpByUserId,
  emailVerificationRequestByUserId,
  emailVerificationPostByUserId,
} = require("../controllers/emailVerification.controller");
const router = express.Router();

router.post("/emailVerificationRequestAPI", emailVerificationRequestAPI);
router.post("/emailVerificationPostAPI", emailVerificationPostAPI);

router.post("/emailVerification", emailVerificationPost);
router.get(
  "/emailVerificationRequest/:encUserId/:message",
  emailVerificationRequest
);

router.post("/emailVerificationPostByUserId", emailVerificationPostByUserId);
router.get(
  "/emailVerificationRequestByUserId/:encUserId/:message",
  emailVerificationRequestByUserId
);

router.get("/resendOtp", resendOtp);
router.get("/resendOtpByUserId/:userId", resendOtpByUserId);

module.exports = router;
