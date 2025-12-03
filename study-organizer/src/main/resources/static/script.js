const API_URL = "http://localhost:8080/tasks";

let tasksCache = [];
let currentFilter = "all";
let searchTerm = "";
let editingId = null;
let completionChart = null;
let velocityChart = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("taskForm")?.addEventListener("submit", handleAddTask);
  document.getElementById("modalCancel")?.addEventListener("click", closeEditModal);
  document.getElementById("modalSave")?.addEventListener("click", handleUpdateTask);
  document.getElementById("refreshBtn")?.addEventListener("click", loadTasks);

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.toLowerCase();
      renderTasks();
    });
  }

  const filterButtons = document.querySelectorAll("[data-filter]");
  filterButtons.forEach((btn) =>
    btn.addEventListener("click", () => setFilter(btn.dataset.filter))
  );

  updateFilterButtons();
  loadTasks();
});

async function loadTasks() {
  try {
    const response = await fetch(API_URL);
    tasksCache = await response.json();
  } catch (error) {
    console.error("No se pudieron obtener las tareas", error);
    return;
  }

  updateStats();
  updateCharts();
  renderTasks();
  renderTimeline();
}

function updateStats() {
  const total = tasksCache.length;
  const completed = tasksCache.filter((task) => task.completed).length;
  const pending = total - completed;
  const percentage = total ? Math.round((completed / total) * 100) : 0;

  document.getElementById("totalTasks").textContent = total;
  document.getElementById("completedTasks").textContent = completed;
  document.getElementById("pendingTasks").textContent = pending;
  document.getElementById("progressValue").textContent = `${percentage}%`;
  document.getElementById("progressBar").style.width = `${percentage}%`;
}

function updateCharts() {
  updateCompletionChart();
  updateVelocityChart();
}

function updateCompletionChart() {
  const ctx = document.getElementById("completionChart");
  if (!ctx || typeof Chart === "undefined") return;

  const completed = tasksCache.filter((task) => task.completed).length;
  const pending = tasksCache.length - completed;

  if (completionChart) {
    completionChart.destroy();
  }

  completionChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Completed", "Pending"],
      datasets: [
        {
          data: [completed, pending],
          backgroundColor: ["#34d399", "#fcd34d"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: true, labels: { color: "#cbd5f5" } },
      },
    },
  });
}

function updateVelocityChart() {
  const ctx = document.getElementById("velocityChart");
  if (!ctx || typeof Chart === "undefined") return;

  const dueDateCounts = {};
  tasksCache.forEach((task) => {
    if (!task.dueDate) return;
    dueDateCounts[task.dueDate] = (dueDateCounts[task.dueDate] || 0) + 1;
  });

  const labels = Object.keys(dueDateCounts).sort(
    (a, b) => new Date(a) - new Date(b)
  );
  const values = labels.map((label) => dueDateCounts[label]);

  if (velocityChart) {
    velocityChart.destroy();
  }

  velocityChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Tareas programadas",
          data: values,
          fill: true,
          borderColor: "#818cf8",
          backgroundColor: "rgba(129, 140, 248, 0.2)",
          tension: 0.4,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#cbd5f5" },
          grid: { color: "rgba(148, 163, 184, 0.1)" },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#cbd5f5" },
          grid: { color: "rgba(148, 163, 184, 0.1)" },
        },
      },
    },
  });
}

function renderTasks() {
  const list = document.getElementById("taskList");
  if (!list) return;

  const filtered = tasksCache
    .filter(matchesFilter)
    .filter(matchesSearch)
    .sort(sortTasks);

  if (!filtered.length) {
    list.innerHTML =
      '<p class="text-sm text-slate-400 text-center">No hay tareas que coincidan con los filtros actuales.</p>';
    return;
  }

  list.innerHTML = filtered.map(createTaskCard).join("");
}

function matchesFilter(task) {
  if (currentFilter === "completed") return task.completed;
  if (currentFilter === "pending") return !task.completed;
  return true;
}

function matchesSearch(task) {
  if (!searchTerm) return true;
  const content = `${task.title} ${task.description || ""}`.toLowerCase();
  return content.includes(searchTerm);
}

function sortTasks(a, b) {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;

  const dateA = a.dueDate ? new Date(a.dueDate) : null;
  const dateB = b.dueDate ? new Date(b.dueDate) : null;

  if (dateA && dateB) return dateA - dateB;
  if (dateA) return -1;
  if (dateB) return 1;
  return a.title.localeCompare(b.title);
}

function createTaskCard(task) {
  const status = getStatusMeta(task);
  const daysLeft = getDaysLeft(task);
  const dueInfo = task.dueDate
    ? `${formatDate(task.dueDate)} ${daysLeft !== null ? `· ${formatDaysLeft(daysLeft)}` : ""}`
    : "Sin fecha definida";

  return `
    <article class="rounded-2xl border ${status.accentBorder} bg-white/5 px-5 py-4 flex flex-col gap-3 hover:bg-white/8 transition">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold ${task.completed ? "line-through text-emerald-200" : ""}">
            ${escapeHtml(task.title)}
          </h3>
          <p class="text-sm text-slate-300 mt-1">${escapeHtml(task.description || "Sin descripción")}</p>
        </div>
        <span class="text-xs font-semibold px-3 py-1 rounded-full ${status.badgeClasses}">${status.label}</span>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <p>📅 ${dueInfo}</p>
        <div class="flex gap-2 flex-wrap">
          <button onclick="toggleTaskCompletion(${task.id})" class="px-3 py-1 rounded-lg text-xs font-semibold ${task.completed ? "bg-emerald-500/20 text-emerald-200" : "bg-indigo-500/20 text-indigo-200"} hover:bg-white/20 transition">
            ${task.completed ? "Marcar como pendiente" : "Marcar completada"}
          </button>
          <button onclick="openEditModal(${task.id})" class="px-3 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 transition">
            Editar
          </button>
          <button onclick="deleteTask(${task.id})" class="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 transition">
            Eliminar
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderTimeline() {
  const timeline = document.getElementById("timelineList");
  if (!timeline) return;

  const upcoming = tasksCache
    .filter((task) => task.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 6);

  if (!upcoming.length) {
    timeline.innerHTML =
      '<p class="text-sm text-slate-400">No hay tareas con fecha registrada.</p>';
    return;
  }

  timeline.innerHTML = upcoming
    .map((task) => {
      const days = getDaysLeft(task);
      const status =
        days === null
          ? ""
          : days < 0
          ? "Atrasada"
          : days === 0
          ? "Hoy"
          : `${days} días`;
      return `
        <div class="border border-white/5 rounded-2xl p-4 hover:bg-white/5 transition">
          <p class="text-xs uppercase text-slate-400 mb-1">${formatDate(
            task.dueDate
          )}</p>
          <h4 class="font-semibold">${escapeHtml(task.title)}</h4>
          <p class="text-sm text-slate-400">${escapeHtml(
            task.description || "Sin descripción"
          )}</p>
          <p class="text-xs text-indigo-300 mt-2">${status}</p>
        </div>
      `;
    })
    .join("");
}

async function handleAddTask(event) {
  event.preventDefault();
  const form = event.target;

  const payload = {
    title: form.title.value,
    description: form.description.value,
    dueDate: form.dueDate.value || null,
    completed: false,
  };

  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  form.reset();
  loadTasks();
}

function openEditModal(id) {
  editingId = id;
  const task = tasksCache.find((t) => t.id === id);
  if (!task) return;

  document.getElementById("editTitle").value = task.title || "";
  document.getElementById("editDescription").value = task.description || "";
  document.getElementById("editDueDate").value = task.dueDate || "";

  document.getElementById("editModal").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
  editingId = null;
}

async function handleUpdateTask() {
  if (!editingId) return;
  const baseTask = tasksCache.find((task) => task.id === editingId);
  if (!baseTask) return;

  const payload = {
    ...baseTask,
    title: document.getElementById("editTitle").value,
    description: document.getElementById("editDescription").value,
    dueDate: document.getElementById("editDueDate").value || null,
  };

  await fetch(`${API_URL}/${editingId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  closeEditModal();
  loadTasks();
}

async function toggleTaskCompletion(id) {
  const task = tasksCache.find((t) => t.id === id);
  if (!task) return;

  const payload = { ...task, completed: !task.completed };

  await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  loadTasks();
}

async function deleteTask(id) {
  await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  loadTasks();
}

function setFilter(filter) {
  currentFilter = filter;
  updateFilterButtons();
  renderTasks();
}

function updateFilterButtons() {
  const buttons = document.querySelectorAll("[data-filter]");
  buttons.forEach((btn) => {
    const isActive = btn.dataset.filter === currentFilter;
    btn.classList.toggle("bg-indigo-500/40", isActive);
    btn.classList.toggle("text-white", isActive);
    btn.classList.toggle("bg-white/10", !isActive);
  });
}

function getStatusMeta(task) {
  if (task.completed) {
    return {
      label: "Completed",
      badgeClasses: "bg-emerald-500/15 text-emerald-200",
      accentBorder: "border-emerald-400/40",
    };
  }

  const days = getDaysLeft(task);
  if (days !== null && days < 0) {
    return {
      label: "Overdue",
      badgeClasses: "bg-rose-500/15 text-rose-200",
      accentBorder: "border-rose-400/30",
    };
  }

  if (days !== null && days <= 3) {
    return {
      label: "Due soon",
      badgeClasses: "bg-amber-500/15 text-amber-200",
      accentBorder: "border-amber-400/30",
    };
  }

  return {
    label: "Pending",
    badgeClasses: "bg-indigo-500/15 text-indigo-200",
    accentBorder: "border-indigo-400/30",
  };
}

function getDaysLeft(task) {
  if (!task.dueDate) return null;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = due - today;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function formatDaysLeft(days) {
  if (days < 0) return `Atrasada ${Math.abs(days)}d`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `Faltan ${days} días`;
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date)) return "Fecha inválida";
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function escapeHtml(value = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.toggleTaskCompletion = toggleTaskCompletion;
window.deleteTask = deleteTask;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
