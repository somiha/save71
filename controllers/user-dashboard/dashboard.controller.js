const db = require("../../config/database.config");
const crypto = require("../../middlewares/crypto");

exports.user_dashboard = (req, res) => {
  var login_status = crypto.decrypt(req.cookies.login_status || "");
  if (login_status) {
    res.render("./user-dashboard/dashboard", {
      ogImage: "https://admin.saveneed.com/images/logo-og.webp",
      ogTitle: "Save71 Connects You and the World through Business.",
      ogUrl: "https://admin-save71.lens-ecom.store",
    });
  } else {
    res.redirect("/login");
  }
};
