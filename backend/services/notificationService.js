const jwt = require("jsonwebtoken");
const db = require("../db");

const dbPromise = db.promise();

let ioInstance = null;

function mapNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    type: row.type,
    title: row.title,
    message: row.message,
    metadata: row.metadata ? safelyParseJson(row.metadata) : null,
    isRead: row.is_read === 1,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
  };
}

function safelyParseJson(value) {
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

async function getNotificationById(id) {
  const [rows] = await dbPromise.query("SELECT * FROM notifications WHERE id = ?", [id]);
  if (rows.length === 0) {
    return null;
  }
  return mapNotification(rows[0]);
}

async function getUnreadCount(userId) {
  const [rows] = await dbPromise.query(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0",
    [userId]
  );
  return rows[0]?.count || 0;
}

function emitToUser(userId, event, payload) {
  if (!ioInstance) {
    return;
  }
  ioInstance.to(`user:${userId}`).emit(event, payload);
}

async function createNotification({ userId, taskId = null, type, title, message, metadata = null }) {
  const [result] = await dbPromise.query(
    "INSERT INTO notifications (user_id, task_id, type, title, message, metadata) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, taskId, type, title, message, metadata ? JSON.stringify(metadata) : null]
  );

  const notification = await getNotificationById(result.insertId);
  const unreadCount = await getUnreadCount(userId);

  emitToUser(userId, "notification:new", { notification, unreadCount });

  return notification;
}

async function listNotifications(userId, limit = 50) {
  const limitValue = Number(limit) || 50;
  const [rows] = await dbPromise.query(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    [userId, limitValue]
  );

  return rows.map(mapNotification);
}

async function markAsRead(userId, ids = []) {
  const cleanedIds = Array.isArray(ids)
    ? ids
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    : [];

  if (cleanedIds.length > 0) {
    await dbPromise.query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${cleanedIds
        .map(() => "?")
        .join(", ")})`,
      [userId, ...cleanedIds]
    );
  }

  const unreadCount = await getUnreadCount(userId);
  emitToUser(userId, "notification:marked-read", { ids: cleanedIds, unreadCount });

  return unreadCount;
}

async function markAllAsRead(userId) {
  await dbPromise.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [userId]);
  const unreadCount = 0;
  emitToUser(userId, "notification:marked-read", { ids: "all", unreadCount });
  return unreadCount;
}

async function notifyUsers(userIds, { taskId = null, type, title, message, metadata = {} }) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return [];
  }

  const jobs = userIds.map((userId) =>
    createNotification({
      userId,
      taskId,
      type,
      title,
      message,
      metadata
    })
  );

  return Promise.all(jobs);
}

function init(io) {
  const secret = process.env.JWT_SECRET || "dev-secret";

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error("Unauthorized"));
    }
    try {
      const decoded = jwt.verify(token, secret);
      socket.data.user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email
      };
      return next();
    } catch (err) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.data.user;

    if (!user) {
      socket.disconnect(true);
      return;
    }

    socket.join(`user:${user.id}`);

    try {
      const unreadCount = await getUnreadCount(user.id);
      socket.emit("notification:sync", { unreadCount });
    } catch (err) {
      console.error("Failed to sync notifications:", err);
    }

    socket.on("disconnect", () => {
      // no-op for now; rooms are cleared automatically
    });
  });

  ioInstance = io;
}

module.exports = {
  init,
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
  notifyUsers,
  getUnreadCount
};
