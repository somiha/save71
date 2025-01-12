// const db = require("../config/database.config");
// const crypto = require("../middlewares/crypto");

// // Controller to save the rating and description
// exports.saveRating = (req, res) => {
//     try {
//         const { rating, description, productId } = req.body;
//         var pID = crypto.smallDecrypt(productId)
//         var uID = crypto.decrypt(req.cookies.userId)

//         // Execute the SQL query to insert the rating into the database
//         db.query(
//             "INSERT INTO `review` (id, product_id, user_id, review_star, review_des) VALUES (NULL, ?, ?, ?, ?)",
//             [pID, uID, rating, description],
//             (error, results) => {
//                 if (error) {
//                     console.error(error);
//                     res.status(500).json({ error: "An error occurred while saving the rating." });
//                 } else {
//                     res.redirect("back");
//                 }
//             }
//         );
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: "An error occurred while saving the rating." });
//     }
// };

const db = require("../config/database.config");
const crypto = require("../middlewares/crypto");

// Controller to save the rating and description
exports.saveRating = (req, res) => {
  try {
    const { rating, description, productId } = req.body;
    const pID = crypto.smallDecrypt(productId);
    const uID = crypto.decrypt(req.cookies.userId);

    // Check if the user has already given a review for the product
    db.query(
      "SELECT * FROM `review` WHERE product_id = ? AND user_id = ?",
      [pID, uID],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({
            error: "An error occurred while checking for existing review.",
          });
        }

        if (results.length > 0) {
          return res
            .status(400)
            .json({ error: "You have already reviewed this product." });
        }

        // Execute the SQL query to insert the rating into the database
        db.query(
          "INSERT INTO `review` (id, product_id, user_id, review_star, review_des) VALUES (NULL, ?, ?, ?, ?)",
          [pID, uID, rating, description],
          (error, results) => {
            if (error) {
              console.error(error);
              return res
                .status(500)
                .json({ error: "An error occurred while saving the rating." });
            } else {
              return res.redirect("back");
            }
          }
        );
      }
    );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "An error occurred while saving the rating." });
  }
};
