const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const Shop = require("../middlewares/shop");
const locationOptimizedDistance = require("../middlewares/locationOptimizedDistance");
const crypto = require("../middlewares/crypto");

exports.areaShop = async (req, res) => {
  try {
    var isLogged = crypto.decrypt(req.cookies.login_status || "");
    if (isLogged) {
      const userId = crypto.decrypt(req.cookies.userId);
      const currencyCode = crypto.decrypt(req.cookies.currencyCode);
      const [
        mainCat,
        subCat,
        extraCat,
        allCat,
        images,
        currRate,
        notification,
      ] = await Promise.all([
        catModel.fetchMainCat(),
        catModel.fetchSubCat(),
        catModel.fetchExtraCat(),
        catModel.fetchAllCat(),
        catModel.fetchFeaturedImages(),
        catModel.fetchCurrencyRate(currencyCode),
        catModel.fetchAllNotifications(userId),
      ]);
      const Shops = await Shop.getShops();

      // Get user's current location from request query parameters
      const location = JSON.parse(JSON.stringify(req.cookies.location) || "{}");
      const userLat = crypto.decrypt(location.latitude);
      const userLng = crypto.decrypt(location.longitude);

      if (!userLat || !userLng) {
        return res
          .status(400)
          .json({ error: "User location is missing or invalid." });
      }

      // Find nearest shops to the user's current location
      const sortedShops =
        await locationOptimizedDistance.getSortedShopsByDistance(
          userLat,
          userLng
        );

      // Get user's order details
      const isLoggedIn = crypto.decrypt(req.cookies.login_status);
      const userImageURL = crypto.decrypt(req.cookies.userImage || "");
      const userName = crypto.decrypt(req.cookies.userName);
      const userID = crypto.decrypt(req.cookies.userId);

      // Fetch user's cart items
      const cart = await new Promise((resolve, reject) => {
        db.query(
          "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ? AND `orders`.`in_cart` = 1 ORDER BY `orders`.`order_id` DESC",
          [userID],
          (err, cartItems) => {
            if (err) {
              reject(err);
            } else {
              resolve(cartItems);
            }
          }
        );
      });

      // Fetch products
      const products = await new Promise((resolve, reject) => {
        db.query(
          "SELECT * FROM `products` \
          INNER JOIN `shop` ON `shop`.`id` = `products`.`seller_id` \
          INNER JOIN `extra_cat` ON `extra_cat`.`extra_cat_id` = `products`.`product_cat_id` \
          INNER JOIN `product_image` ON `product_image`.`product_id` = `products`.`product_id` \
          WHERE `products`.`quantity` = 0 \
              AND `products`.`status` = 1 \
              AND `products`.`admin_published` = 1 \
              AND `shop`.`shop_type` = 2 \
              AND `product_image`.`featured_image` = 1;",
          (err, productsData) => {
            if (err) {
              reject(err);
            } else {
              resolve(productsData);
            }
          }
        );
      });

      const updatedProducts = products.map((product) => {
        const shop = sortedShops.find((shop) => shop.id == product.seller_id);
        return {
          ...product,
          shop,
        };
      });

      var encImages = images.map((image) => {
        image.product_id = crypto.smallEncrypt(image.product_id);
        return image;
      });

      var encProduct = updatedProducts.map((product) => {
        product.product_id = crypto.smallEncrypt(product.product_id);
        var image = encImages.find(
          (image) => image.product_id == product.product_id
        );
        product.product_image_url = image ? image.product_image_url : "";
        return product;
      });
      // console.log('details: ', encProduct[0].shop.distanceKm)

      var encSortedShops = sortedShops.map((shop) => {
        shop.id = crypto.smallEncrypt(shop.id);
        var image = encImages.find(
          (image) => image.product_id == shop.product_id
        );
        shop.product_image_url = image ? image.product_image_url : "";
        return shop;
      });

      var encCart = cart.map((item) => {
        item.product_id = crypto.smallEncrypt(item.product_id);
        return item;
      });

      console.log("Products: ", encProduct[0]);

      // Render the template securely
      res.render("area-shop", {
        ogImage: "https://saveneed.com/images/logo-og.webp",
        ogTitle: "Save71 Connects You and the World through Business.",
        ogUrl: "http://localhost:3000",
        navId: "area-shop",
        currRate,
        currencyCode,
        images: encImages,
        userName: userName,
        userImage: userImageURL,
        login_status: isLoggedIn,
        products: encProduct,
        cart: encCart,
        subCat: subCat,
        mainCat: mainCat,
        extraCat: extraCat,
        allCat: allCat,
        shops: encSortedShops,
        notification: notification,
      });
    } else {
      res.redirect("/login");
      return;
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
