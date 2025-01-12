// const jwt = require("jsonwebtoken");
// const dotenv = require('dotenv');
const crypto = require("../middlewares/crypto");

let login_status = false;

const checkLogin = (req, res, next) => {
    // const token = crypto.decrypt(req.cookies.token);
    // if(token){
    //     jwt.verify(token, "fasdfsdfsdfuihyfweuibfjbsdf%",(err, data) => {
    //         if(!err){
    //             req.usermobile = data.usermobile;
    //             req.userId = data.userId;
    //             req.login_status = true;

    //             return next();
    //         }else{
    //             res.clearCookie('token');
    //             return res.redirect('/');
    //         }
    //     });
    // }else {
    //     next();
    // }

    if (req.cookies.userId != undefined) {
        var token = crypto.decrypt(req.cookies.userId)
    } else {
        var token = undefined
    }
    // const token = req.cookies.userId;

    if(token){
        req.userId = token;
        req.login_status = true;
        return next();
    }else {
        next();
    }

};

module.exports = checkLogin;