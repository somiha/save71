const express = require("express");
const router = express.Router();
const ratingController = require("../controllers/rating.controller");

// Route to save the rating
router.post("/ratings", ratingController.saveRating);

module.exports = router;
