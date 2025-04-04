const db = require("../../config/database.config");
const catModel = require("../../middlewares/cat");
const mult_upload = require("../../config/multer_product.config");
const crypto = require("../../middlewares/crypto");
const { convertAndDelete } = require("../../middlewares/webp_converter");
const path = require("path");
const {
  queryAsync,
  queryAsyncWithoutValue,
  getEndpointsOfEmployees,
} = require("../../config/helper");

exports.getFaq = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
    try {
      // Specify the directory containing the images
      const directoryPath = path.join(
        __dirname,
        "../../public/images/products"
      );

      // Call the function
      convertAndDelete(directoryPath)
        .then(() => console.log("Images converted successfully"))
        .catch((err) => console.error("Error during conversion:", err));

      const notification = await catModel.fetchAllNotifications(
        crypto.decrypt(req.cookies.userId)
      );
      const currencyCode = crypto.decrypt(req.cookies.currencyCode);
      const [mainCat, subCat, extraCat, allCat, images, currRate] =
        await Promise.all([
          catModel.fetchMainCat(),
          catModel.fetchSubCat(),
          catModel.fetchExtraCat(),
          catModel.fetchAllCat(),
          catModel.fetchFeaturedImages(),
          catModel.fetchCurrencyRate(currencyCode),
        ]);
      var pID = req.params.product_id;
      var usepID = crypto.smallDecrypt(pID);
      console.log("usepID : ", usepID);

      const myPermissions = await getEndpointsOfEmployees(
        crypto.decrypt(req.cookies.userId)
      );

      var userImage = crypto.decrypt(req.cookies.userImage || "");
      var userName = crypto.decrypt(req.cookies.userName || "");
      db.query(
        "SELECT * FROM `product_faq` WHERE `product_id` = ?",
        [usepID],
        (err1, res1) => {
          if (!err1) {
            var uID = crypto.decrypt(req.cookies.userId);
            db.query(
              "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ?",
              [uID],
              (err2, res2) => {
                if (!err2) {
                  var encImages = images.map((item) => {
                    item.product_id = crypto.smallEncrypt(item.product_id);
                    return item;
                  });
                  var encCart = res2.map((item) => {
                    item.product_id = crypto.smallEncrypt(item.product_id);
                    return item;
                  });

                  res.render("shop-employee/emp-faq", {
                    ogImage: "https://admin.saveneed.com/images/logo-og.webp",
                    ogTitle:
                      "Save71 Connects You and the World through Business.",
                    ogUrl: "https://admin-save71.lens-ecom.store",
                    notification: notification,
                    currRate,
                    currencyCode,
                    images: encImages,
                    myPermissions,
                    menuId: "emp-faq",
                    name: "FAQ",
                    userImage: userImage,
                    userName: userName,
                    login_status: isLogged,
                    faqs: res1,
                    subCat: subCat,
                    mainCat: mainCat,
                    extraCat: extraCat,
                    allCat: allCat,
                    cart: encCart,
                    product_id: pID,
                  });
                } else {
                  res.send(err2);
                }
              }
            );
          } else {
            res.send(err1);
          }
        }
      );
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
  }
};

exports.addFaq = (req, res) => {
  var pID = req.params.product_id;
  var usepID = crypto.smallDecrypt(pID);
  var { question, answer } = req.body;
  db.query(
    "INSERT INTO `product_faq` (`faq_id`, `product_id`, `question`, `answer`) VALUES (NULL, ?, ?, ?)",
    [usepID, question, answer],
    (err1, res1) => {
      if (!err1) {
        res.redirect("back");
      } else {
        res.send(err1);
      }
    }
  );
};
exports.updateFaq = (req, res) => {
  var fID = req.params.faq_id;
  var { qus, ans } = req.body;
  db.query(
    "UPDATE `product_faq` SET `question` = ?, `answer` = ? WHERE `product_faq`.`faq_id` = ?",
    [qus, ans, fID],
    (err1, res1) => {
      if (!err1) {
        res.redirect("back");
      } else {
        res.send(err1);
      }
    }
  );
};
exports.delFaq = (req, res) => {
  var fID = req.params.faq_id;
  db.query(
    "DELETE FROM `product_faq` WHERE `product_faq`.`faq_id` = ?",
    [fID],
    (err1, res1) => {
      if (!err1) {
        res.redirect("back");
      } else {
        res.send(err1);
      }
    }
  );
};
