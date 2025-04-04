const db = require("../config/database.config");

exports.aboutUs = (req, res) => {
  db.query("SELECT * FROM site_info", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.render("site_info", {
        ogImage: "https://admin.saveneed.com/images/logo-og.webp",
        ogTitle: "Save71 Connects You and the World through Business.",
        ogUrl: "https://admin-save71.lens-ecom.store",
        site_info: result[0].about_us,
      });
    }
  });
};

exports.policy = (req, res) => {
  db.query("SELECT * FROM site_info", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.render("site_info", {
        ogImage: "https://admin.saveneed.com/images/logo-og.webp",
        ogTitle: "Save71 Connects You and the World through Business.",
        ogUrl: "https://admin-save71.lens-ecom.store",
        site_info: result[0].privacy_policy,
      });
    }
  });
};

exports.terms_and_condition = (req, res) => {
  db.query("SELECT * FROM site_info", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.render("site_info", {
        ogImage: "https://admin.saveneed.com/images/logo-og.webp",
        ogTitle: "Save71 Connects You and the World through Business.",
        ogUrl: "https://admin-save71.lens-ecom.store",
        site_info: result[0].terms_and_condition,
      });
    }
  });
};

exports.contact_us = (req, res) => {
  db.query("SELECT * FROM site_info", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.render("site_info", {
        ogImage: "https://admin.saveneed.com/images/logo-og.webp",
        ogTitle: "Save71 Connects You and the World through Business.",
        ogUrl: "https://admin-save71.lens-ecom.store",
        site_info: result[0].contact_us,
      });
    }
  });
};

exports.brand_guidelines = (req, res) => {
  db.query("SELECT * FROM site_info", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.render("site_info", {
        ogImage: "https://admin.saveneed.com/images/logo-og.webp",
        ogTitle: "Save71 Connects You and the World through Business.",
        ogUrl: "https://admin-save71.lens-ecom.store",
        site_info: result[0].brand_guidelines,
      });
    }
  });
};

exports.notice = (req, res) => {
  db.query("SELECT * FROM site_info", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.render("site_info", {
        ogImage: "https://admin.saveneed.com/images/logo-og.webp",
        ogTitle: "Save71 Connects You and the World through Business.",
        ogUrl: "https://admin-save71.lens-ecom.store",
        site_info: result[0].notice,
      });
    }
  });
};
