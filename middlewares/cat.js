// cat.js

const db = require("../config/database.config");

// Helper function for fetching main_cat data from the database
exports.fetchMainCat = () => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM `main_cat` ORDER BY `main_cat`.`main_cat_name` ASC", (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

// Helper function for fetching sub_cat data from the database
exports.fetchSubCat = () => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM `sub_cat` ORDER BY `sub_cat`.`sub_cat_name` ASC", (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

// Helper function for fetching extra_cat data from the database
exports.fetchExtraCat = () => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM `extra_cat` ORDER BY `extra_cat`.`extra_cat_name` ASC, `extra_cat`.`popular_cat_value` DESC", (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

// Helper function for fetching allCat data from the database
exports.fetchAllCat = () => {
    return new Promise((resolve, reject) => {
        db.query(
            "SELECT * FROM `sub_cat` INNER JOIN `main_cat` ON `main_cat`.`main_cat_id` = `sub_cat`.`sub_cat_ref` INNER JOIN `extra_cat` ON `sub_cat`.`sub_cat_id` = `extra_cat`.`extra_cat_ref`  INNER JOIN `products` ON `extra_cat`.`extra_cat_id` = `products`.`product_cat_id`",
            (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            }
        );
    });
};


exports.fetchAllProducts = () => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM `products`", (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

exports.fetchFeaturedImages = () => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM `products` INNER JOIN `product_image` ON `products`.`product_id` = `product_image`.`product_id` WHERE `product_image`.`featured_image` = 1", (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

exports.fetchFeaturedTempImages = () => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM `product_template` INNER JOIN `product_temp_images` ON `product_template`.`temp_id` = `product_temp_images`.`product_temp_id` WHERE `product_temp_images`.`featured_image` = 1", (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

exports.fetchCurrencyRate = (currencyCode) => {
    return new Promise((resolve, reject) => {
        // console.log("curr:", currencyCode)
        db.query("SELECT `rate` FROM `exchange_rates` WHERE `sign` = ?", [currencyCode], (err, res) => {
            if (err) {
                reject(err);
            } else {
                if (res.length === 0) {
                    reject(new Error("Currency rate not found"));
                } else {
                    resolve(res[0].rate);
                }
            }
        });
    });
};

exports.fetchTaxRate = (currencyCode) => {
    return new Promise((resolve, reject) => {
        // console.log("curr:", currencyCode)
        db.query("SELECT `tax_percentage` FROM `exchange_rates` WHERE `sign` = ?", [currencyCode], (err, res) => {
            if (err) {
                reject(err);
            } else {
                if (res.length === 0) {
                    reject(new Error("Currency rate not found"));
                } else {
                    resolve(res[0].tax_percentage);
                }
            }
        });
    });
};

exports.fetchAllUserInfo = () => {
    return new Promise((resolve, reject) => {
        db.query("SELECT `user`.`user_id`, `user`.`user_name`, `user`.`user_email`, `user`.`reference_id`, `user`.`phone`, `shop`.`id` FROM `user` INNER JOIN `shop` ON `shop`.`seller_user_id` = `user`.`user_id`", (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};


exports.fetchAllNotifications = (userID) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM `notification` WHERE `user_id` = ? ORDER BY `notification`.`notification_id` DESC", [userID] , (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

exports.setNotification = (userID, notification, url) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO `notification` (`notification_id`, `user_id`, `notification`, `url`, `is_read`) VALUES (NULL, ?, ?, ?, '0')",
        [userID, notification, url] , (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

exports.sellerCustomUrlToID = (customURL) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM `shop` WHERE `shop_custom_url` = ?",
        [customURL] , (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};