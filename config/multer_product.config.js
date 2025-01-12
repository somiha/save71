const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname + "/../public/images/products");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "_" + Math.round(Math.random() * 1e9);

    // Check if the file is PNG, JPG, or JPEG
    const allowedExtensions = [".png", ".jpg", ".jpeg"];
    const fileExtension = allowedExtensions.includes(
      path.extname(file.originalname).toLowerCase()
    )
      ? "webp"
      : path.extname(file.originalname).toLowerCase();

    cb(null, uniqueSuffix + "." + fileExtension);
  },
});

const upload = multer({ storage: storage });

module.exports = upload;
