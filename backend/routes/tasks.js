const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/auth");
const notificationService = require("../services/notificationService");

const router = express.Router();
const dbPromise = db.promise();

const VALID_STATUSES = new Set(["Pending", "In Progress", "Completed"]);
const VALID_ACCESS_LEVELS = new Set(["full", "limited"]);

router.use(authMiddleware);

async function getTaskParticipants(taskIds) {
  if (!taskIds || taskIds.length === 0) {
    return new Map();
  }

  const [rows] = await dbPromise.query(
    `
      SELECT tp.task_id, tp.user_id, tp.access_level, tp.status,
             u.username AS participant_username, u.email AS participant_email
      FROM task_participants tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.task_id IN (?)
    `,
    [taskIds]
  );

  const map = new Map();

  rows.forEach((row) => {
    if (!map.has(row.task_id)) {
      map.set(row.task_id, []);
    }

    map.get(row.task_id).push({
      id: row.user_id,
      username: row.participant_username,
      email: row.participant_email,
      accessLevel: row.access_level,
      status: row.status
    });
  });

  return map;
}

function calculateOverallProgress(ownerStatus, participants) {
  const totalParticipants = (participants?.length || 0) + 1;
  const ownerContribution = ownerStatus === "Completed" ? 1 : 0;
  const participantContribution =
    participants?.filter((participant) => participant.status === "Completed").length || 0;

  if (totalParticipants === 0) {
    return { totalParticipants: 0, completedParticipants: 0, overallProgress: 0 };
  }

  const completedParticipants = ownerContribution + participantContribution;
  const overallProgress = Math.round((completedParticipants / totalParticipants) * 100);

  return { totalParticipants, completedParticipants, overallProgress };
}

function buildTaskPayload(row, participantsMap, viewerId) {
  const rawParticipants = participantsMap.get(row.id) || [];
  const participants = rawParticipants.map((participant) => ({
    ...participant,
    isCurrentUser: participant.id === viewerId
  }));
  const viewerIsOwner = row.user_id === viewerId;
  const viewerParticipant = viewerIsOwner
    ? null
    : participants.find((participant) => participant.id === viewerId) || null;

  const owner = {
    id: row.user_id,
    username: row.owner_username,
    email: row.owner_email,
    status: row.status
  };

  const viewerStatus = viewerIsOwner
    ? row.status
    : viewerParticipant?.status || row.viewer_status || "Pending";

  const viewerAccessLevel = viewerIsOwner
    ? "owner"
    : viewerParticipant?.accessLevel || row.viewer_access_level || null;

  const permissions = {
    canEdit: viewerIsOwner || viewerAccessLevel === "full",
    canDelete: viewerIsOwner || viewerAccessLevel === "full",
    canUpdateProgress: viewerIsOwner || !!viewerParticipant,
    canShare: viewerIsOwner
  };

  const { totalParticipants, completedParticipants, overallProgress } = calculateOverallProgress(
    row.status,
    rawParticipants
  );

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: viewerStatus,
    viewerStatus,
    ownerStatus: row.status,
    due_date: row.due_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner,
    isOwner: viewerIsOwner,
    participants,
    totalParticipants,
    completedParticipants,
    overallProgress,
    permissions,
    viewerAccessLevel
  };
}

async function loadTasksForViewer(viewerId, taskIds = null) {
  const params = [viewerId, viewerId];
  let whereClause = "(t.user_id = ? OR viewerParticipation.user_id IS NOT NULL)";

  if (Array.isArray(taskIds) && taskIds.length > 0) {
    whereClause += " AND t.id IN (?)";
    params.push(taskIds);
  }

  const [rows] = await dbPromise.query(
    `
      SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.due_date,
        t.created_at,
        t.updated_at,
        t.user_id,
        owner.username AS owner_username,
        owner.email AS owner_email,
        viewerParticipation.access_level AS viewer_access_level,
        viewerParticipation.status AS viewer_status
      FROM tasks t
      JOIN users owner ON owner.id = t.user_id
      LEFT JOIN task_participants viewerParticipation
        ON viewerParticipation.task_id = t.id AND viewerParticipation.user_id = ?
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
    `,
    params
  );

  if (rows.length === 0) {
    return [];
  }

  const taskIdsFetched = rows.map((row) => row.id);
  const participantsMap = await getTaskParticipants(taskIdsFetched);

  return rows.map((row) => buildTaskPayload(row, participantsMap, viewerId));
}

async function loadTaskForViewer(taskId, viewerId) {
  const tasks = await loadTasksForViewer(viewerId, [taskId]);
  return tasks[0] || null;
}

function normalizeStatus(status, fallback) {
  if (typeof status !== "string") {
    return fallback;
  }

  const trimmedStatus = status.trim();
  return VALID_STATUSES.has(trimmedStatus) ? trimmedStatus : fallback;
}

function resolveActor(req) {
  return {
    id: req.user.id,
    username: req.user.username || req.user.email || "Someone"
  };
}

async function getTaskMeta(taskId) {
  const [taskRows] = await dbPromise.query(
    "SELECT id, title, user_id FROM tasks WHERE id = ?",
    [taskId]
  );

  if (taskRows.length === 0) {
    return null;
  }

  const task = taskRows[0];
  const [participantRows] = await dbPromise.query(
    "SELECT user_id FROM task_participants WHERE task_id = ?",
    [taskId]
  );

  return {
    taskId: task.id,
    title: task.title,
    ownerId: task.user_id,
    participantIds: participantRows.map((row) => row.user_id)
  };
}

async function notifyTaskParticipants({
  meta,
  taskId,
  actor,
  type,
  title,
  message,
  metadata = {}
}) {
  const taskMeta = meta || (taskId ? await getTaskMeta(taskId) : null);

  if (!taskMeta) {
    return;
  }

  const recipients = new Set(taskMeta.participantIds || []);
  if (taskMeta.ownerId) {
    recipients.add(taskMeta.ownerId);
  }
  recipients.delete(actor.id);

  if (recipients.size === 0) {
    return;
  }

  await notificationService.notifyUsers(Array.from(recipients), {
    taskId: taskMeta.taskId,
    type,
    title,
    message,
    metadata: {
      taskId: taskMeta.taskId,
      taskTitle: taskMeta.title,
      actorId: actor.id,
      actorName: actor.username,
      ...metadata
    }
  });
}

router.get("/", async (req, res) => {
  const userId = req.user.id;

  try {
    const tasks = await loadTasksForViewer(userId);
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.get("/:id", async (req, res) => {
  const userId = req.user.id;
  const taskId = Number(req.params.id);

  if (!Number.isInteger(taskId)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  try {
    const task = await loadTaskForViewer(taskId, userId);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(task);
  } catch (err) {
    console.error("Error fetching task:", err);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

router.post("/", async (req, res) => {
  const userId = req.user.id;
  const { title, description, status, due_date } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }

  const normalizedStatus = normalizeStatus(status, "Pending");
  const normalizedDueDate = due_date && due_date !== "" ? due_date : null;

  try {
    const taskPayload = {
      title: title.trim(),
      description: description || null,
      status: normalizedStatus,
      due_date: normalizedDueDate,
      user_id: userId
    };

    const [result] = await dbPromise.query("INSERT INTO tasks SET ?", taskPayload);
    const task = await loadTaskForViewer(result.insertId, userId);

    res.status(201).json(task);
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.put("/:id", async (req, res) => {
  const userId = req.user.id;
  const actor = resolveActor(req);
  const taskId = Number(req.params.id);
  const { title, description, status, due_date } = req.body;

  if (!Number.isInteger(taskId)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  try {
    const [existingRows] = await dbPromise.query("SELECT id FROM tasks WHERE id = ?", [taskId]);

    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const access = await loadTaskForViewer(taskId, userId);

    if (!access) {
      return res.status(403).json({ error: "You do not have access to this task" });
    }

    if (!access.permissions.canEdit) {
      return res.status(403).json({ error: "You do not have permission to edit this task" });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({ error: "Title cannot be empty" });
      }
      updates.push("title = ?");
      values.push(title.trim());
    }

    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description || null);
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.has(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      updates.push("status = ?");
      values.push(status);
    }

    if (due_date !== undefined) {
      updates.push("due_date = ?");
      values.push(due_date && due_date !== "" ? due_date : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    values.push(taskId);
    await dbPromise.query(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`, values);

    const updatedTask = await loadTaskForViewer(taskId, userId);

    const taskMeta = await getTaskMeta(taskId);

    if (taskMeta) {
      await notifyTaskParticipants({
        meta: taskMeta,
        actor,
        type: "task_updated",
        title: "Task updated",
        message: `${actor.username} updated "${taskMeta.title}".`,
        metadata: {
          action: "update",
          ...(status !== undefined ? { status } : {})
        }
      });
    }

    res.json(updatedTask);
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = req.user.id;
  const taskId = Number(req.params.id);

  if (!Number.isInteger(taskId)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  try {
    const [existingRows] = await dbPromise.query("SELECT id FROM tasks WHERE id = ?", [taskId]);

    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const access = await loadTaskForViewer(taskId, userId);

    if (!access) {
      return res.status(403).json({ error: "You do not have access to this task" });
    }

    if (!access.permissions.canDelete) {
      return res.status(403).json({ error: "You do not have permission to delete this task" });
    }

    await dbPromise.query("DELETE FROM tasks WHERE id = ?", [taskId]);

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

router.post("/:id/share", async (req, res) => {
  const userId = req.user.id;
  const taskId = Number(req.params.id);
  const { email, identifier, accessLevel } = req.body;
  const actor = resolveActor(req);

  if (!Number.isInteger(taskId)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  const lookup = (identifier || email || "").trim();

  if (!lookup) {
    return res.status(400).json({ error: "Email or username is required to share a task" });
  }

  const normalizedAccessLevel =
    typeof accessLevel === "string" && VALID_ACCESS_LEVELS.has(accessLevel.toLowerCase())
      ? accessLevel.toLowerCase()
      : "limited";

  try {
    const [taskRows] = await dbPromise.query("SELECT user_id, title FROM tasks WHERE id = ?", [taskId]);

    if (taskRows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (taskRows[0].user_id !== userId) {
      return res.status(403).json({ error: "Only the task owner can share this task" });
    }

    const [userRows] = await dbPromise.query(
      "SELECT id, username, email FROM users WHERE email = ? OR username = ? LIMIT 1",
      [lookup, lookup]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const targetUser = userRows[0];

    if (targetUser.id === userId) {
      return res.status(400).json({ error: "You cannot share a task with yourself" });
    }

    const [existingShare] = await dbPromise.query(
      "SELECT id FROM task_participants WHERE task_id = ? AND user_id = ?",
      [taskId, targetUser.id]
    );

    if (existingShare.length > 0) {
      return res.status(400).json({ error: "Task is already shared with this user" });
    }

    await dbPromise.query(
      `
        INSERT INTO task_participants (task_id, user_id, access_level, status, invited_by)
        VALUES (?, ?, ?, 'Pending', ?)
      `,
      [taskId, targetUser.id, normalizedAccessLevel, userId]
    );

    const taskMeta = await getTaskMeta(taskId);

    await notificationService.createNotification({
      userId: targetUser.id,
      taskId,
      type: "task_shared",
      title: "Task shared with you",
      message: `${actor.username} shared "${taskMeta?.title || "a task"}" with you.`,
      metadata: {
        taskId,
        taskTitle: taskMeta?.title || null,
        actorId: actor.id,
        actorName: actor.username,
        accessLevel: normalizedAccessLevel
      }
    });

    const updatedTask = await loadTaskForViewer(taskId, userId);
    res.status(201).json(updatedTask);
  } catch (err) {
    console.error("Error sharing task:", err);
    res.status(500).json({ error: "Failed to share task" });
  }
});

router.put("/:id/progress", async (req, res) => {
  const userId = req.user.id;
  const actor = resolveActor(req);
  const taskId = Number(req.params.id);
  const { status } = req.body;

  if (!Number.isInteger(taskId)) {
    return res.status(400).json({ error: "Invalid task id" });
  }

  if (!VALID_STATUSES.has(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const [existingRows] = await dbPromise.query("SELECT id FROM tasks WHERE id = ?", [taskId]);

    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const access = await loadTaskForViewer(taskId, userId);

    if (!access) {
      return res.status(403).json({ error: "You do not have access to this task" });
    }

    if (!access.permissions.canUpdateProgress) {
      return res.status(403).json({ error: "You do not have permission to update progress" });
    }

    if (access.owner.id === userId) {
      await dbPromise.query("UPDATE tasks SET status = ? WHERE id = ?", [status, taskId]);
    } else {
      await dbPromise.query(
        "UPDATE task_participants SET status = ? WHERE task_id = ? AND user_id = ?",
        [status, taskId, userId]
      );
    }

    const updatedTask = await loadTaskForViewer(taskId, userId);

    const taskMeta = await getTaskMeta(taskId);
    if (taskMeta) {
      await notifyTaskParticipants({
        meta: taskMeta,
        actor,
        type: "task_progress",
        title: "Progress updated",
        message: `${actor.username} updated progress on "${taskMeta.title}" to ${status}.`,
        metadata: {
          action: "progress",
          status
        }
      });
    }

    res.json(updatedTask);
  } catch (err) {
    console.error("Error updating task progress:", err);
    res.status(500).json({ error: "Failed to update task progress" });
  }
});

module.exports = router;

