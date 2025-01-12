const db = require("../config/database.config");

exports.addNote = async (req, res) => {
  const { note, orderId } = req.body;

  if (!note || !orderId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    db.query(
      "INSERT INTO notes (id, note, order_id) VALUES (NULL, ?, ?)",
      [note, orderId],
      (error, result) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "Internal server error" });
        }
        res.redirect(`/order_details/${orderId}`);
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.addCancelNote = async (req, res) => {
  const { cancel_note, order_id, user_id, from_seller, seller_id } = req.body;

  console.log(cancel_note, order_id, user_id);

  if (!cancel_note || !order_id || !user_id || !seller_id) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Insert the cancellation note into the database
    db.query(
      "INSERT INTO cancel_note (cancel_note, order_id, user_id, from_seller, seller_id) VALUES (?, ?, ?, ?, ?)",
      [cancel_note, order_id, user_id, from_seller, seller_id],
      (error, result) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "Internal server error" });
        }

        // Now retrieve the order_status for this order_id
        db.query(
          "SELECT order_status FROM orders WHERE order_id = ?",
          [order_id],
          (err, orderResult) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: "Internal server error" });
            }

            if (orderResult.length === 0) {
              return res.status(404).json({ message: "Order not found" });
            }

            const order_status = orderResult[0].order_status;

            // Redirect based on the order status
            if (order_status === 4) {
              // Redirect to cancel logic for order_status 4
              return res.redirect(`/order_details/${order_id}/2`);
            } else if (order_status === 3) {
              // Redirect to cancel logic for order_status 3
              return res.redirect(`/order_details/${order_id}/2`);
            } else {
              // Default fallback redirection if order_status is not 3 or 4
              return res.redirect(`/order_details/${order_id}`);
            }
          }
        );
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
