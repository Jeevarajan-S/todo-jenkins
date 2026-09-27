const express = require('express');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const APP_VERSION = process.env.APP_VERSION || require('./package.json').version;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- In-memory data store ----------
let tasks = [];
let nextId = 1;

function resetStore() {
  tasks = [];
  nextId = 1;
}

function findTask(id) {
  return tasks.find((t) => t.id === Number(id));
}

function cleanText(text) {
  return typeof text === 'string' ? text.trim() : '';
}

// ---------- Health check (used by Docker, Jenkins and tests) ----------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: APP_VERSION, uptime: process.uptime() });
});

// ---------- Task API ----------
// GET /api/tasks?filter=all|pending|completed
app.get('/api/tasks', (req, res) => {
  const filter = req.query.filter || 'all';
  let result = tasks;
  if (filter === 'pending') result = tasks.filter((t) => !t.completed);
  else if (filter === 'completed') result = tasks.filter((t) => t.completed);

  res.json({
    tasks: result,
    counts: {
      total: tasks.length,
      pending: tasks.filter((t) => !t.completed).length,
      completed: tasks.filter((t) => t.completed).length,
    },
  });
});

// POST /api/tasks  { text }
app.post('/api/tasks', (req, res) => {
  const text = cleanText(req.body && req.body.text);
  if (!text) return res.status(400).json({ error: 'Task text is required.' });
  if (text.length > 200) return res.status(400).json({ error: 'Task text must be 200 characters or fewer.' });

  const task = { id: nextId++, text, completed: false, createdAt: new Date().toISOString() };
  tasks.push(task);
  res.status(201).json(task);
});

// PUT /api/tasks/:id  { text?, completed? }
app.put('/api/tasks/:id', (req, res) => {
  const task = findTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const body = req.body || {};
  if (body.text !== undefined) {
    const text = cleanText(body.text);
    if (!text) return res.status(400).json({ error: 'Task text is required.' });
    if (text.length > 200) return res.status(400).json({ error: 'Task text must be 200 characters or fewer.' });
    task.text = text;
  }
  if (body.completed !== undefined) {
    if (typeof body.completed !== 'boolean') {
      return res.status(400).json({ error: '"completed" must be true or false.' });
    }
    task.completed = body.completed;
  }
  res.json(task);
});

// DELETE /api/tasks/completed  (clear all completed tasks)
// Must be declared before /api/tasks/:id so "completed" is not treated as an id.
app.delete('/api/tasks/completed', (req, res) => {
  const before = tasks.length;
  tasks = tasks.filter((t) => !t.completed);
  res.json({ removed: before - tasks.length });
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', (req, res) => {
  const task = findTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  tasks = tasks.filter((t) => t.id !== task.id);
  res.status(204).end();
});

// Unknown API routes return JSON 404
app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found.' }));

// ---------- Start server (only when run directly, not when imported by tests) ----------
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`To-Do app v${APP_VERSION} running on http://localhost:${PORT}`);
  });

  // Graceful shutdown so `docker stop` is fast and clean
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = { app, resetStore };
