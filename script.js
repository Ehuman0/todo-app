const STORAGE_KEY = "todo-tasks";

const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const list = document.getElementById("task-list");
const emptyMsg = document.getElementById("empty");
const countEl = document.getElementById("count");
const clearBtn = document.getElementById("clear-done");
const filterButtons = document.querySelectorAll(".filter");

let tasks = load();
let filter = "all";

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function render() {
  list.innerHTML = "";

  const visible = tasks.filter(t =>
    filter === "all" ? true : filter === "done" ? t.done : !t.done
  );

  visible.forEach(task => {
    const li = document.createElement("li");
    if (task.done) li.classList.add("done");

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = task.done;
    box.setAttribute("aria-label", "Mark done");
    box.addEventListener("change", () => {
      task.done = box.checked;
      save();
      render();
    });

    // textContent (not innerHTML) keeps user input from running as code
    const text = document.createElement("span");
    text.textContent = task.text;

    const del = document.createElement("button");
    del.className = "delete";
    del.textContent = "Delete";
    del.setAttribute("aria-label", "Delete task: " + task.text);
    del.addEventListener("click", () => {
      tasks = tasks.filter(t => t.id !== task.id);
      save();
      render();
    });

    li.append(box, text, del);
    list.appendChild(li);
  });

  emptyMsg.hidden = visible.length > 0;
  const left = tasks.filter(t => !t.done).length;
  countEl.textContent = tasks.length
    ? `${left} of ${tasks.length} left to do`
    : "Nothing yet";
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  tasks.push({ id: Date.now(), text: value, done: false });
  input.value = "";
  save();
  render();
});

filterButtons.forEach(btn =>
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    filterButtons.forEach(b => b.classList.toggle("active", b === btn));
    render();
  })
);

clearBtn.addEventListener("click", () => {
  tasks = tasks.filter(t => !t.done);
  save();
  render();
});

render();
