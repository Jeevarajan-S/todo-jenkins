// To-Do List front end. All data lives on the Express server (/api/tasks).

const state = {
  tasks: [],
  counts: { total: 0, pending: 0, completed: 0 },
  filter: 'all',
  editingId: null,
};

const els = {
  form: document.getElementById('add-form'),
  input: document.getElementById('new-task'),
  list: document.getElementById('task-list'),
  empty: document.getElementById('empty'),
  error: document.getElementById('error'),
  summary: document.getElementById('summary'),
  progress: document.getElementById('progress-bar'),
  clear: document.getElementById('clear-completed'),
  version: document.getElementById('version'),
  filters: document.querySelectorAll('.filter'),
  countAll: document.getElementById('count-all'),
  countPending: document.getElementById('count-pending'),
  countCompleted: document.getElementById('count-completed'),
};

const ICONS = {
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  cancel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
};

// ---------- API helper ----------
async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function showError(message) {
  els.error.textContent = message;
  els.error.hidden = !message;
}

// ---------- Data loading ----------
async function loadTasks() {
  try {
    const data = await request('GET', `/api/tasks?filter=${state.filter}`);
    state.tasks = data.tasks;
    state.counts = data.counts;
    showError('');
    render();
  } catch (err) {
    showError('Could not reach the server. Check that it is running and refresh the page.');
  }
}

// ---------- Rendering ----------
function render() {
  const { total, pending, completed } = state.counts;

  els.summary.textContent =
    total === 0 ? 'Nothing to do' :
    pending === 0 ? 'All done' :
    `${pending} ${pending === 1 ? 'task' : 'tasks'} left`;
  els.progress.style.width = total ? `${(completed / total) * 100}%` : '0';

  els.countAll.textContent = total;
  els.countPending.textContent = pending;
  els.countCompleted.textContent = completed;
  els.clear.disabled = completed === 0;

  els.filters.forEach((btn) => {
    const active = btn.dataset.filter === state.filter;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  els.list.innerHTML = '';
  state.tasks.forEach((task) => els.list.appendChild(renderTask(task)));

  els.empty.hidden = state.tasks.length > 0;
  els.empty.textContent =
    total === 0 ? 'No tasks yet. Add your first one above.' :
    state.filter === 'pending' ? 'No pending tasks. Nice work.' :
    state.filter === 'completed' ? 'No completed tasks yet.' : '';
}

function renderTask(task) {
  const li = document.createElement('li');
  li.className = 'task' + (task.completed ? ' completed' : '');
  li.dataset.id = task.id;

  if (state.editingId === task.id) {
    const input = document.createElement('input');
    input.className = 'edit-input';
    input.value = task.text;
    input.maxLength = 200;
    input.setAttribute('aria-label', 'Edit task');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveEdit(task.id, input.value);
      if (e.key === 'Escape') cancelEdit();
    });

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    actions.append(
      iconButton('save', 'Save changes', () => saveEdit(task.id, input.value)),
      iconButton('cancel', 'Cancel editing', cancelEdit)
    );

    li.append(input, actions);
    setTimeout(() => { input.focus(); input.select(); }, 0);
    return li;
  }

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.completed;
  checkbox.setAttribute('aria-label', `Mark "${task.text}" as ${task.completed ? 'pending' : 'completed'}`);
  checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));

  const text = document.createElement('span');
  text.className = 'task-text';
  text.textContent = task.text; // textContent prevents HTML injection
  text.title = 'Double-click to edit';
  text.addEventListener('dblclick', () => startEdit(task.id));

  const actions = document.createElement('div');
  actions.className = 'task-actions';
  actions.append(
    iconButton('edit', `Edit "${task.text}"`, () => startEdit(task.id)),
    iconButton('delete', `Delete "${task.text}"`, () => deleteTask(task.id))
  );

  li.append(checkbox, text, actions);
  return li;
}

function iconButton(kind, label, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `icon-btn ${kind}`;
  btn.innerHTML = ICONS[kind];
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.addEventListener('click', onClick);
  return btn;
}

// ---------- Actions ----------
async function addTask(text) {
  try {
    await request('POST', '/api/tasks', { text });
    els.input.value = '';
    await loadTasks();
  } catch (err) {
    showError(err.message);
  }
}

async function toggleTask(id, completed) {
  try {
    await request('PUT', `/api/tasks/${id}`, { completed });
    await loadTasks();
  } catch (err) {
    showError(err.message);
  }
}

function startEdit(id) {
  state.editingId = id;
  render();
}

function cancelEdit() {
  state.editingId = null;
  render();
}

async function saveEdit(id, text) {
  if (!text.trim()) {
    showError('Task text cannot be empty. Type something or press Esc to cancel.');
    return;
  }
  try {
    await request('PUT', `/api/tasks/${id}`, { text });
    state.editingId = null;
    await loadTasks();
  } catch (err) {
    showError(err.message);
  }
}

async function deleteTask(id) {
  try {
    await request('DELETE', `/api/tasks/${id}`);
    if (state.editingId === id) state.editingId = null;
    await loadTasks();
  } catch (err) {
    showError(err.message);
  }
}

async function clearCompleted() {
  try {
    await request('DELETE', '/api/tasks/completed');
    await loadTasks();
  } catch (err) {
    showError(err.message);
  }
}

// ---------- Event wiring ----------
els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = els.input.value.trim();
  if (!text) {
    showError('Type a task before adding it.');
    return;
  }
  addTask(text);
});

els.filters.forEach((btn) => {
  btn.addEventListener('click', () => {
    state.filter = btn.dataset.filter;
    state.editingId = null;
    loadTasks();
  });
});

els.clear.addEventListener('click', clearCompleted);

// Show the running version in the footer (handy for proving a new deploy worked)
request('GET', '/health')
  .then((h) => { els.version.textContent = `v${h.version}`; })
  .catch(() => {});

loadTasks();
