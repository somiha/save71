const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");

exports.uploadProduct = async (req, res) => {
  // try {
  //   const [mainCat, subCat, extraCat, allCat, images] = await Promise.all([
  //     catModel.fetchMainCat(),
  //     catModel.fetchSubCat(),
  //     catModel.fetchExtraCat(),
  //     catModel.fetchAllCat(),
  //     catModel.fetchFeaturedImages()
  //   ]);
  // var uID = crypto.decrypt(req.cookies.userId)
  // var isLogged = crypto.decrypt(req.cookies.login_status)
  // var userImage = crypto.decrypt(req.cookies.userImage || '')
  // var userName = crypto.decrypt(req.cookies.userName)
  // db.query("SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ?",
  //   [uID], (err2, res2) => {
  //     res.render("upload-product", { images : images, userName: userName, userImage: userImage, cart: res2, login_status: isLogged, subCat: subCat, mainCat: mainCat, extraCat: extraCat, allCat: allCat, });
  //   })
  // } catch (err) {
  //   console.error(err);
  //   // Handle error and send appropriate response
  //   res.status(500).send("Internal Server Error");
  // }
};
