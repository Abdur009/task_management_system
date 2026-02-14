const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const dbPromise = db.promise();

router.use(authMiddleware);

// Optimized single-query summary endpoint
router.get("/summary", async (req, res) => {
  const userId = req.user.id;

  try {
    // Single optimized query for all summary data
    const [rows] = await dbPromise.query(
      `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN t.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
          SUM(CASE WHEN t.due_date < CURDATE() AND t.status != 'Completed' THEN 1 ELSE 0 END) AS overdue,
          SUM(CASE WHEN t.created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) THEN 1 ELSE 0 END) AS created_this_week,
          SUM(CASE WHEN t.status = 'Completed' AND t.updated_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) THEN 1 ELSE 0 END) AS completed_this_week,
          SUM(CASE WHEN t.created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN 1 ELSE 0 END) AS created_this_month,
          SUM(CASE WHEN t.status = 'Completed' AND t.updated_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN 1 ELSE 0 END) AS completed_this_month
        FROM tasks t
        LEFT JOIN task_participants tp ON tp.task_id = t.id AND tp.user_id = ?
        WHERE t.user_id = ? OR tp.user_id IS NOT NULL
      `,
      [userId, userId]
    );

    const stats = rows[0] || {};
    const result = {
      totalTasks: Number(stats.total) || 0,
      completedTasks: Number(stats.completed) || 0,
      pendingTasks: Number(stats.pending) || 0,
      inProgressTasks: Number(stats.in_progress) || 0,
      overdueTasks: Number(stats.overdue) || 0,
      tasksCreatedThisWeek: Number(stats.created_this_week) || 0,
      tasksCompletedThisWeek: Number(stats.completed_this_week) || 0,
      tasksCreatedThisMonth: Number(stats.created_this_month) || 0,
      tasksCompletedThisMonth: Number(stats.completed_this_month) || 0
    };

    res.json(result);
  } catch (err) {
    console.error("Error fetching analytics summary:", err);
    res.status(500).json({ error: "Failed to fetch analytics summary" });
  }
});

// Optimized trends endpoint
router.get("/trends", async (req, res) => {
  const userId = req.user.id;
  const range = req.query.range === "monthly" ? "monthly" : "weekly";

  try {
    const interval = range === "weekly" ? 7 : 30;

    // Optimized single query with JOIN
    const [rows] = await dbPromise.query(
      `
        SELECT
          DATE(t.created_at) AS date,
          COUNT(*) AS created,
          SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN t.due_date < DATE(t.created_at) AND t.status != 'Completed' THEN 1 ELSE 0 END) AS overdue
        FROM tasks t
        LEFT JOIN task_participants tp ON tp.task_id = t.id AND tp.user_id = ?
        WHERE (t.user_id = ? OR tp.user_id IS NOT NULL)
          AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(t.created_at)
        ORDER BY DATE(t.created_at) ASC
      `,
      [userId, userId, interval]
    );

    const data = rows.map((row) => ({
      date: row.date,
      created: Number(row.created) || 0,
      completed: Number(row.completed) || 0,
      overdue: Number(row.overdue) || 0
    }));

    res.json({ range, data });
  } catch (err) {
    console.error("Error fetching analytics trends:", err);
    res.status(500).json({ error: "Failed to fetch analytics trends" });
  }
});

// Optimized status breakdown
router.get("/status-breakdown", async (req, res) => {
  const userId = req.user.id;

  try {
    // Optimized single query with JOIN
    const [rows] = await dbPromise.query(
      `
        SELECT
          t.status,
          COUNT(*) AS count
        FROM tasks t
        LEFT JOIN task_participants tp ON tp.task_id = t.id AND tp.user_id = ?
        WHERE t.user_id = ? OR tp.user_id IS NOT NULL
        GROUP BY t.status
      `,
      [userId, userId]
    );

    const total = rows.reduce((sum, row) => sum + Number(row.count), 0);

    const statusMap = {
      Pending: 0,
      "In Progress": 0,
      Completed: 0
    };

    rows.forEach((row) => {
      if (Object.prototype.hasOwnProperty.call(statusMap, row.status)) {
        statusMap[row.status] = Number(row.count);
      }
    });

    const breakdown = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));

    res.json(breakdown);
  } catch (err) {
    console.error("Error fetching status breakdown:", err);
    res.status(500).json({ error: "Failed to fetch status breakdown" });
  }
});

// Optimized participant progress with single query
router.get("/participant-progress", async (req, res) => {
  const userId = req.user.id;

  try {
    // Single optimized query using UNION ALL for better performance
    const [rows] = await dbPromise.query(
      `
        SELECT
          SUM(total_count) AS total_participants,
          SUM(completed_count) AS completed_participants
        FROM (
          SELECT
            COUNT(*) AS total_count,
            SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completed_count
          FROM tasks t
          LEFT JOIN task_participants tp ON tp.task_id = t.id AND tp.user_id = ?
          WHERE t.user_id = ? OR tp.user_id IS NOT NULL
          UNION ALL
          SELECT
            COUNT(*) AS total_count,
            SUM(CASE WHEN tp.status = 'Completed' THEN 1 ELSE 0 END) AS completed_count
          FROM task_participants tp
          INNER JOIN tasks t ON t.id = tp.task_id
          LEFT JOIN task_participants tp2 ON tp2.task_id = t.id AND tp2.user_id = ?
          WHERE t.user_id = ? OR tp2.user_id IS NOT NULL
        ) AS combined
      `,
      [userId, userId, userId, userId]
    );

    const totalParticipants = Number(rows[0]?.total_participants) || 0;
    const completedParticipants = Number(rows[0]?.completed_participants) || 0;
    const overallProgress =
      totalParticipants > 0
        ? Math.round((completedParticipants / totalParticipants) * 100)
        : 0;

    res.json({
      totalParticipants,
      completedParticipants,
      overallProgress
    });
  } catch (err) {
    console.error("Error fetching participant progress:", err);
    res.status(500).json({ error: "Failed to fetch participant progress" });
  }
});

module.exports = router;
