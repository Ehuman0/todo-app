const STORAGE_KEY = "todo-tasks";

const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const dateInput = document.getElementById("task-date");
const list = document.getElementById("task-list");
const emptyMsg = document.getElementById("empty");
const countEl = document.getElementById("count");
const headingEl = document.getElementById("heading");
const todayEl = document.getElementById("today-date");
const clearBtn = document.getElementById("clear-done");
const filtersEl = document.getElementById("filters");
const filterButtons = document.querySelectorAll(".filter");
const tabButtons = document.querySelectorAll(".tab");

let view = "today";   // "today" or "upcoming"
let filter = "all";
let editingId = null;
let dragId = null;

/* ---------- Dates ---------- */

function toDateString(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function todayString() {
  return toDateString(new Date());
}

function tomorrowString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateString(d);
}

function fromDateString(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(s, withYear) {
  return fromDateString(s).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {})
  });
}

/* ---------- Storage ---------- */

function load() {
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    saved = [];
  }
  // Tasks saved by the older version have no date: treat them as today's
  return saved.map(t => ({ ...t, date: t.date || todayString() }));
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

let tasks = load();

/* ---------- Helpers ---------- */

function visibleTasks() {
  const today = todayString();
  if (view === "today") {
    return tasks.filter(t => {
      if (t.date > today) return false;
      if (filter === "active") return !t.done;
      if (filter === "done") return t.done;
      return true;
    });
  }
  // Upcoming: sorted by date; array order is kept within the same date
  return tasks
    .filter(t => t.date > today)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function moveTask(id, targetId, after) {
  if (id === targetId) return;
  const from = tasks.findIndex(t => t.id === id);
  const [item] = tasks.splice(from, 1);
  let to = tasks.findIndex(t => t.id === targetId);
  if (after) to++;
  tasks.splice(to, 0, item);
  save();
  render();
}

function sameGroup(a, b) {
  // In Upcoming, tasks can only be reordered within the same date
  return view === "today" || a.date === b.date;
}

/* ---------- Render ---------- */

function render() {
  const today = todayString();
  todayEl.textContent = formatDate(today, true);
  headingEl.textContent = view === "today" ? "Today" : "Upcoming";

  document.getElementById("task-date").hidden = view !== "upcoming";
  dateInput.required = view === "upcoming";
  dateInput.min = tomorrowString();
  if (!dateInput.value || dateInput.value < tomorrowString()) {
    dateInput.value = tomorrowString();
  }
  input.placeholder = view === "today" ? "What needs doing today?" : "What needs doing later?";
  filtersEl.hidden = view !== "today";
  clearBtn.hidden = view !== "today";

  list.innerHTML = "";
  const visible = visibleTasks();
  let lastDate = null;

  visible.forEach((task, index) => {
    if (view === "upcoming" && task.date !== lastDate) {
      const group = document.createElement("li");
      group.className = "group";
      group.textContent = formatDate(task.date, false);
      list.appendChild(group);
      lastDate = task.date;
    }
    list.appendChild(buildItem(task, visible, index, today));
  });

  if (visible.length === 0) {
    emptyMsg.hidden = false;
    emptyMsg.textContent = view === "today"
      ? "No tasks here. Add one above."
      : "Nothing planned yet. Pick a date and add a task.";
  } else {
    emptyMsg.hidden = true;
  }

  if (view === "today") {
    const dueToday = tasks.filter(t => t.date <= today);
    const left = dueToday.filter(t => !t.done).length;
    countEl.textContent = dueToday.length
      ? `${left} of ${dueToday.length} left to do`
      : "Nothing yet";
  } else {
    const n = tasks.filter(t => t.date > today).length;
    countEl.textContent = n === 1 ? "1 task planned" : `${n} tasks planned`;
  }
}

function buildItem(task, visible, index, today) {
  const li = document.createElement("li");
  li.className = "task";
  if (task.done) li.classList.add("done");
  li.dataset.id = task.id;
  li.draggable = editingId !== task.id;

  const handle = document.createElement("span");
  handle.className = "handle";
  handle.textContent = "⋮⋮";
  handle.setAttribute("aria-hidden", "true");
  handle.title = "Drag to reorder";

  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = task.done;
  box.setAttribute("aria-label", "Mark done");
  box.addEventListener("change", () => {
    task.done = box.checked;
    save();
    render();
  });

  const body = document.createElement("div");
  body.className = "body";

  if (editingId === task.id) {
    const edit = document.createElement("input");
    edit.type = "text";
    edit.className = "edit-input";
    edit.value = task.text;
    edit.maxLength = 120;
    edit.setAttribute("aria-label", "Edit task");
    let finished = false;
    const finish = commit => {
      if (finished) return;
      finished = true;
      const value = edit.value.trim();
      if (commit && value) task.text = value;
      editingId = null;
      save();
      render();
    };
    edit.addEventListener("keydown", e => {
      if (e.key === "Enter") finish(true);
      if (e.key === "Escape") finish(false);
    });
    edit.addEventListener("blur", () => finish(true));
    body.appendChild(edit);
    setTimeout(() => { edit.focus(); edit.select(); }, 0);
  } else {
    // textContent (not innerHTML) keeps user input from running as code
    const text = document.createElement("span");
    text.className = "text";
    text.textContent = task.text;
    text.addEventListener("dblclick", () => {
      editingId = task.id;
      render();
    });
    body.appendChild(text);

    if (view === "today" && task.date < today) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = "From " + fromDateString(task.date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
      body.appendChild(tag);
    }
  }

  const actions = document.createElement("div");
  actions.className = "actions";

  const up = makeButton("↑", "Move up", () => {
    const prev = visible[index - 1];
    if (prev && sameGroup(task, prev)) moveTask(task.id, prev.id, false);
  });
  const down = makeButton("↓", "Move down", () => {
    const next = visible[index + 1];
    if (next && sameGroup(task, next)) moveTask(task.id, next.id, true);
  });
  const edit = makeButton("Edit", "Edit task: " + task.text, () => {
    editingId = task.id;
    render();
  });
  const del = makeButton("Delete", "Delete task: " + task.text, () => {
    tasks = tasks.filter(t => t.id !== task.id);
    save();
    render();
  });
  del.classList.add("delete");

  actions.append(up, down, edit, del);
  li.append(handle, box, body, actions);

  /* Drag and drop */
  li.addEventListener("dragstart", e => {
    dragId = task.id;
    li.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(task.id));
  });
  li.addEventListener("dragover", e => {
    const dragged = tasks.find(t => t.id === dragId);
    if (!dragged || dragged.id === task.id || !sameGroup(dragged, task)) return;
    e.preventDefault();
    const rect = li.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    li.classList.toggle("over-after", after);
    li.classList.toggle("over-before", !after);
  });
  li.addEventListener("dragleave", () => {
    li.classList.remove("over-before", "over-after");
  });
  li.addEventListener("drop", e => {
    e.preventDefault();
    const dragged = tasks.find(t => t.id === dragId);
    if (!dragged || !sameGroup(dragged, task)) return;
    const rect = li.getBoundingClientRect();
    moveTask(dragId, task.id, e.clientY > rect.top + rect.height / 2);
  });
  li.addEventListener("dragend", () => {
    dragId = null;
    render();
  });

  return li;
}

function makeButton(label, ariaLabel, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "small";
  b.textContent = label;
  b.setAttribute("aria-label", ariaLabel);
  b.addEventListener("click", onClick);
  return b;
}

/* ---------- Events ---------- */

form.addEventListener("submit", e => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  const date = view === "upcoming" ? dateInput.value : todayString();
  if (view === "upcoming" && date <= todayString()) return;
  tasks.push({ id: Date.now(), text: value, done: false, date });
  input.value = "";
  save();
  render();
});

tabButtons.forEach(btn =>
  btn.addEventListener("click", () => {
    view = btn.dataset.view;
    editingId = null;
    tabButtons.forEach(b => {
      const active = b === btn;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", String(active));
    });
    render();
  })
);

filterButtons.forEach(btn =>
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    filterButtons.forEach(b => b.classList.toggle("active", b === btn));
    render();
  })
);

clearBtn.addEventListener("click", () => {
  const today = todayString();
  tasks = tasks.filter(t => !(t.done && t.date <= today));
  save();
  render();
});

// If the tab stays open past midnight, refresh the date and lists
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});

render();
