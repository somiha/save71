const db = require("./database.config");

// Helper function to wrap db.query in a promise
function queryAsync(query, values) {
  return new Promise((resolve, reject) => {
    db.query(query, values, (err, result) => {
      if (err) {
        console.log(err);
        reject(err);
      } else resolve(result);
    });
  });
}
function queryAsyncWithoutValue(query) {
  return new Promise((resolve, reject) => {
    db.query(query, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function getEndpointsOfEmployees(userId) {
  // Fetch the employee data
  const employee = await queryAsync(
    "SELECT * FROM shop_employee WHERE id = ?",
    [userId]
  );

  if (employee.length === 0) {
    return [];
  }

  // Parse the permissions array
  let permissionsArray = [];
  try {
    permissionsArray = JSON.parse(employee[0].permissions);
  } catch (e) {
    console.error("Error parsing permissions:", e);
  }

  // Prepare the SQL query based on whether permissionsArray is empty or not
  let myPermissions;
  if (permissionsArray.length > 0) {
    myPermissions = await queryAsync(
      "SELECT access_links FROM shop_employee_permissions WHERE permission_id IN (?)", // Update column name here
      [permissionsArray]
    );
  } else {
    myPermissions = [];
  }

  const endPoints = getUniqueEndpoints(myPermissions);

  return endPoints;
}

function getUniqueEndpoints(permissions) {
  // Extract links from each access_links field
  const allLinks = permissions.reduce((acc, permission) => {
    const parsedLinks = JSON.parse(permission.access_links).links;
    return acc.concat(parsedLinks);
  }, []);

  // Remove duplicates
  const uniqueLinks = [...new Set(allLinks)];

  return uniqueLinks;
}

module.exports = {
  queryAsync,
  queryAsyncWithoutValue,
  getEndpointsOfEmployees,
};
