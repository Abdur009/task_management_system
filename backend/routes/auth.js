const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

// Helper to generate JWT
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
  };

  const secret = process.env.JWT_SECRET || "dev-secret";

  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

// Register (signup)
router.post("/register", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Username, email and password are required" });
  }

  // Check if user already exists
  db.query(
    "SELECT id FROM users WHERE email = ? OR username = ?",
    [email, username],
    async (err, results) => {
      if (err) {
        console.error("Error checking existing user:", err);
        return res.status(500).json({ error: "Failed to register user" });
      }

      if (results.length > 0) {
        return res.status(400).json({ error: "User with that email or username already exists" });
      }

      try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
          "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
          [username, email, hashedPassword],
          (insertErr, insertResult) => {
            if (insertErr) {
              console.error("Error inserting user:", insertErr);
              return res.status(500).json({ error: "Failed to register user" });
            }

            const newUser = {
              id: insertResult.insertId,
              username,
              email,
            };

            const token = generateToken(newUser);

            res.status(201).json({
              user: newUser,
              token,
            });
          }
        );
      } catch (hashErr) {
        console.error("Error hashing password:", hashErr);
        res.status(500).json({ error: "Failed to register user" });
      }
    }
  );
});

// Login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        console.error("Error fetching user:", err);
        return res.status(500).json({ error: "Failed to login" });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const user = results[0];

      try {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = generateToken(user);

        res.json({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          token,
        });
      } catch (compareErr) {
        console.error("Error comparing password:", compareErr);
        res.status(500).json({ error: "Failed to login" });
      }
    }
  );
});

module.exports = router;

