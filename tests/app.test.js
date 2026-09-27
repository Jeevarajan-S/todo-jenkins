// Automated tests for the To-Do app.
// Uses Node's built-in test runner (node:test) and fetch, so no extra
// test libraries are needed. Requires Node.js 18 or newer.

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, resetStore } = require('../server');

let server;
let baseUrl;

before(async () => {
  // Port 0 = let the OS pick a free port, so tests never clash with a running app
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => resetStore());

async function api(method, url, body) {
  const res = await fetch(baseUrl + url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
}

describe('Server', () => {
  test('starts and responds to the health check', async () => {
    const res = await api('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  test('serves the main page', async () => {
    const res = await fetch(baseUrl + '/');
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.match(html, /To-Do List/);
  });

  test('serves the stylesheet and script', async () => {
    const css = await fetch(baseUrl + '/style.css');
    const js = await fetch(baseUrl + '/script.js');
    assert.equal(css.status, 200);
    assert.equal(js.status, 200);
  });
});

describe('Task API', () => {
  test('starts with an empty list', async () => {
    const res = await api('GET', '/api/tasks');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.tasks, []);
    assert.deepEqual(res.body.counts, { total: 0, pending: 0, completed: 0 });
  });

  test('adds a task', async () => {
    const res = await api('POST', '/api/tasks', { text: '  Write Jenkinsfile  ' });
    assert.equal(res.status, 201);
    assert.equal(res.body.text, 'Write Jenkinsfile');
    assert.equal(res.body.completed, false);
    assert.ok(res.body.id);
  });

  test('rejects an empty task', async () => {
    const res = await api('POST', '/api/tasks', { text: '   ' });
    assert.equal(res.status, 400);
  });

  test('edits a task', async () => {
    const created = await api('POST', '/api/tasks', { text: 'Old text' });
    const res = await api('PUT', `/api/tasks/${created.body.id}`, { text: 'New text' });
    assert.equal(res.status, 200);
    assert.equal(res.body.text, 'New text');
  });

  test('marks a task as completed', async () => {
    const created = await api('POST', '/api/tasks', { text: 'Build Docker image' });
    const res = await api('PUT', `/api/tasks/${created.body.id}`, { completed: true });
    assert.equal(res.status, 200);
    assert.equal(res.body.completed, true);
  });

  test('deletes a task', async () => {
    const created = await api('POST', '/api/tasks', { text: 'Temporary' });
    const del = await api('DELETE', `/api/tasks/${created.body.id}`);
    assert.equal(del.status, 204);
    const list = await api('GET', '/api/tasks');
    assert.equal(list.body.tasks.length, 0);
  });

  test('returns 404 for a missing task', async () => {
    const res = await api('PUT', '/api/tasks/999', { text: 'Nope' });
    assert.equal(res.status, 404);
  });

  test('filters tasks and counts them', async () => {
    const a = await api('POST', '/api/tasks', { text: 'A' });
    await api('POST', '/api/tasks', { text: 'B' });
    await api('POST', '/api/tasks', { text: 'C' });
    await api('PUT', `/api/tasks/${a.body.id}`, { completed: true });

    const pending = await api('GET', '/api/tasks?filter=pending');
    const completed = await api('GET', '/api/tasks?filter=completed');
    const all = await api('GET', '/api/tasks?filter=all');

    assert.equal(pending.body.tasks.length, 2);
    assert.equal(completed.body.tasks.length, 1);
    assert.equal(all.body.tasks.length, 3);
    assert.deepEqual(all.body.counts, { total: 3, pending: 2, completed: 1 });
  });

  test('clears completed tasks', async () => {
    const a = await api('POST', '/api/tasks', { text: 'Done 1' });
    const b = await api('POST', '/api/tasks', { text: 'Done 2' });
    await api('POST', '/api/tasks', { text: 'Still pending' });
    await api('PUT', `/api/tasks/${a.body.id}`, { completed: true });
    await api('PUT', `/api/tasks/${b.body.id}`, { completed: true });

    const res = await api('DELETE', '/api/tasks/completed');
    assert.equal(res.status, 200);
    assert.equal(res.body.removed, 2);

    const list = await api('GET', '/api/tasks');
    assert.equal(list.body.tasks.length, 1);
    assert.equal(list.body.tasks[0].text, 'Still pending');
  });
});
