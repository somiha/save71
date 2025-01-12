const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const Shop = require("../middlewares/shop");
const locationOptimizedDistance = require("../middlewares/locationOptimizedDistance");
const crypto = require("../middlewares/crypto");

exports.getNearestManufacturer = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
    try {
      const userId = crypto.decrypt(req.cookies.userId);
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
      const sortedShopsAndProductsByDistance =
        await locationOptimizedDistance.getSortedShopsAndProductsByDistance(
          userLat,
          userLng,
          userId,
          1,
          4
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
          "SELECT * FROM `products` INNER JOIN `extra_cat` ON `extra_cat`.`extra_cat_id` = `products`.`product_cat_id` WHERE `products`.`quantity` = 0 AND `products`.`status` = 1 AND `products`.`admin_published` = 1",
          (err, productsData) => {
            if (err) {
              reject(err);
            } else {
              resolve(productsData);
            }
          }
        );
      });
      var encImages = images.map((image) => {
        image.product_id = crypto.smallEncrypt(image.product_id);
        return image;
      });

      var encProducts = products.map((product) => {
        product.product_id = crypto.smallEncrypt(product.product_id);
        const image = encImages.find(
          (img) => img.product_id === product.product_id
        );
        product.product_image_url = image ? image.product_image_url : "";
        return product;
      });

      var encCart = cart.map((item) => {
        item.product_id = crypto.smallEncrypt(item.product_id);
        return item;
      });
      sortedShopsAndProductsByDistance.forEach((shop) => {
        shop.product_id = crypto.smallEncrypt(shop.product_id);
        const image = encImages.find(
          (image) => image.product_id === shop.product_id
        );
        shop.product_image_url = image ? image.product_image_url : "";
      });

      // Render the template securely
      res.render("nearest-product", {
        ogImage: "https://admin.save71.com/images/logo-og.webp",
        ogTitle: "Save71 Connects You and the World through Business.",
        ogUrl: "https://admin-save71.lens-ecom.store",
        currRate,
        currencyCode,
        images: encImages,
        userName: userName,
        userImage: userImageURL,
        login_status: isLoggedIn,
        products: encProducts,
        cart: encCart,
        subCat: subCat,
        mainCat: mainCat,
        extraCat: extraCat,
        extra_cat: extraCat,
        allExtraCat: extraCat,
        allCat: allCat,
        shops: sortedShopsAndProductsByDistance,
        notification: notification,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
    return;
  }
};

exports.getNearestProducts = async (req, res) => {
  try {
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
    const Shops = await Shop.getShops();

    var isLogged = crypto.decrypt(req.cookies.login_status || "");
    if (isLogged) {
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
      const sortedShopsAndProductsByDistance =
        await locationOptimizedDistance.getSortedShopsAndProductsByDistance(
          userLat,
          userLng,
          crypto.decrypt(req.cookies.userId),
          2,
          4
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
          "SELECT * FROM `products` INNER JOIN `extra_cat` ON `extra_cat`.`extra_cat_id` = `products`.`product_cat_id` WHERE `products`.`quantity` = 0 AND `products`.`status` = 1 AND `products`.`admin_published` = 1",
          (err, productsData) => {
            if (err) {
              reject(err);
            } else {
              resolve(productsData);
            }
          }
        );
      });

      var encImages = images.map((image) => {
        image.product_id = crypto.smallEncrypt(image.product_id);
        return image;
      });

      var encProducts = products.map((product) => {
        product.product_id = crypto.smallEncrypt(product.product_id);
        const image = encImages.find(
          (img) => img.product_id === product.product_id
        );
        product.product_image_url = image ? image.product_image_url : "";
        return product;
      });

      sortedShopsAndProductsByDistance.forEach((shop) => {
        shop.product_id = crypto.smallEncrypt(shop.product_id);
        const image = encImages.find(
          (image) => image.product_id === shop.product_id
        );
        shop.product_image_url = image ? image.product_image_url : "";
      });

      // Render the template securely
      res.render("nearest-product", {
        ogImage: "https://admin.save71.com/images/logo-og.webp",
        ogTitle: "Save71 Connects You and the World through Business.",
        ogUrl: "https://admin-save71.lens-ecom.store",
        currRate,
        currencyCode,
        images: encImages,
        userName: userName,
        userImage: userImageURL,
        login_status: isLoggedIn,
        products: encProducts,
        cart: cart,
        subCat: subCat,
        mainCat: mainCat,
        extraCat: extraCat,
        extra_cat: extraCat,
        allExtraCat: extraCat,
        allCat: allCat,
        shops: sortedShopsAndProductsByDistance,
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
