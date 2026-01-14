require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const taskRoutes = require("./routes/tasks");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);
app.use("/profile", profileRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
