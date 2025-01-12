const db = require('../config/database.config');

function getShops() {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM shop', (error, results, fields) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    })
    .catch((error) => {
        console.error(error);
        throw new Error('Unable to fetch shops.');
    });
}

module.exports = {
    getShops,
};
