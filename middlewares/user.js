const db = require("../config/database.config");

exports.getUserByPhoneNumber = (phone) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `user` WHERE `user`.`phone` = ?",
      [phone],
      (error, results, fields) => {
        if (error) {
          return reject(error);
        }
        return resolve(results[0]);
      }
    );
  });
};

exports.getUserByPhoneNumberUserDemo = (phone) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `user_demo` WHERE `user_demo`.`phone` = ?",
      [phone],
      (error, results, fields) => {
        if (error) {
          return reject(error);
        }
        return resolve(results[0]);
      }
    );
  });
};

exports.getUserByEmail = (phone) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `user` WHERE `user`.`user_email` = ?",
      [phone],
      (error, results, fields) => {
        if (error) {
          return reject(error);
        }
        return resolve(results[0]);
      }
    );
  });
};

exports.getUserByDemoEmail = (phone) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `user_demo` WHERE `user_demo`.`user_email` = ?",
      [phone],
      (error, results, fields) => {
        if (error) {
          return reject(error);
        }
        return resolve(results[0]);
      }
    );
  });
};

exports.getUserByEmailUserDemo = (phone) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `user_demo` WHERE `user_demo`.`user_email` = ?",
      [phone],
      (error, results, fields) => {
        if (error) {
          return reject(error);
        }
        return resolve(results[0]);
      }
    );
  });
};

exports.getUserByUserIdUserDemo = (user_id) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `user_demo` WHERE `user_demo`.`user_id` = ?",
      [user_id],
      (error, results, fields) => {
        if (error) {
          return reject(error);
        }
        return resolve(results[0]);
      }
    );
  });
};

exports.getByRefId = (refId) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `user` WHERE `user`.`own_ref_id` = ?",
      [refId],
      (error, results, fields) => {
        if (error) {
          return reject(error);
        }
        return resolve(results[0]);
      }
    );
  });
};

exports.getDemoByUserId = (userId) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `user_demo` WHERE `user_demo`.`user_id` = ?",
      [userId],
      (error, results, fields) => {
        if (error) {
          return reject(error);
        }
        return resolve(results[0]);
      }
    );
  });
};
