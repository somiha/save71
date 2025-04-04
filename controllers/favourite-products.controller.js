const db = require("../config/database.config");
const crypto = require("../middlewares/crypto");

exports.favouriteProducts = (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (!isLogged) {
    return res.redirect("/login");
  }
  var sID = crypto.decrypt(req.cookies.userId || "");
  db.query(
    "SELECT * FROM `products` INNER JOIN `product_image` ON `products`.`product_id` = `product_image`.`product_id` WHERE `products`.`seller_id` = ? ORDER BY `products`.`sell_count` DESC;",
    [sID],
    (err1, fProducts) => {
      res.render("favourite-product", {
        ogImage: "https://admin.saveneed.com/images/logo-og.webp",
        ogTitle: "Save71 Connects You and the World through Business.",
        ogUrl: "https://admin-save71.lens-ecom.store",
        menuId: "shop-owner-fv-products",
        fProducts: fProducts,
      });
    }
  );
};
