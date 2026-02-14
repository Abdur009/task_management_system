const express = require("express");
const authMiddleware = require("../middleware/auth");
const notificationService = require("../services/notificationService");

const router = express.Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      notificationService.listNotifications(req.user.id),
      notificationService.getUnreadCount(req.user.id)
    ]);

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.post("/mark-read", async (req, res) => {
  try {
    const { ids } = req.body;
    const unreadCount = await notificationService.markAsRead(req.user.id, ids);
    res.json({ unreadCount });
  } catch (err) {
    console.error("Error marking notifications as read:", err);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

router.post("/mark-all-read", async (req, res) => {
  try {
    const unreadCount = await notificationService.markAllAsRead(req.user.id);
    res.json({ unreadCount });
  } catch (err) {
    console.error("Error marking notifications (all) as read:", err);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

module.exports = router;
