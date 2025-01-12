const express = require("express");
const {
  regRender,
  regPost,
  regPostAPI,
} = require("../controllers/registration.controller");
const loginRouter = express.Router();
const upload = require("../config/multer.config");
const isLogged = require("../middlewares/isLogin");

loginRouter.get("/registration", isLogged, regRender);
loginRouter.post("/registration", upload.none(), regPost);
loginRouter.post("/registration-api", upload.none(), regPostAPI);

module.exports = loginRouter;
