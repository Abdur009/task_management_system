const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Apply auth middleware to all profile routes
router.use(authMiddleware);

// Get current user's profile
router.get("/", (req, res) => {
  const userId = req.user.id;

  db.query(
    "SELECT id, username, email, created_at, updated_at FROM users WHERE id = ?",
    [userId],
    (err, results) => {
      if (err) {
        console.error("Error fetching profile:", err);
        return res.status(500).json({ error: "Failed to fetch profile" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(results[0]);
    }
  );
});

// Update profile (username, email)
router.put("/", (req, res) => {
  const userId = req.user.id;
  const { username, email } = req.body;

  if (!username || !email) {
    return res.status(400).json({ error: "Username and email are required" });
  }

  db.query(
    "UPDATE users SET username = ?, email = ? WHERE id = ?",
    [username, email, userId],
    (err, result) => {
      if (err) {
        console.error("Error updating profile:", err);
        return res.status(500).json({ error: "Failed to update profile" });
      }

      res.json({ id: userId, username, email });
    }
  );
});

// Change password
router.put("/password", (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  const bcrypt = require("bcryptjs");

  bcrypt
    .hash(password, 10)
    .then((hashedPassword) => {
      db.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, userId],
        (err) => {
          if (err) {
            console.error("Error updating password:", err);
            return res.status(500).json({ error: "Failed to change password" });
          }

          res.json({ message: "Password updated successfully" });
        }
      );
    })
    .catch((err) => {
      console.error("Error hashing password:", err);
      res.status(500).json({ error: "Failed to change password" });
    });
});

// NOTE: Endpoints for profile picture upload/delete are not implemented yet.
// The frontend expects /profile/picture POST/DELETE; you can add file upload
// handling later with multer or similar if needed.

module.exports = router;

