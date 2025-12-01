const api = "http://localhost:8080/tasks";

async function loadTasks() {
    const res = await fetch(api);
    const tasks = await res.json();

    const list = document.getElementById("taskList");
    list.innerHTML = "";

    tasks.forEach(t => {
        const item = document.createElement("div");
        item.className = "task-item";
        item.innerHTML = `
            <strong>${t.title}</strong> – ${t.description}
            <br>
            Due: ${t.dueDate}
            <span class="delete-btn" onclick="deleteTask(${t.id})">Delete</span>
        `;
        list.appendChild(item);
    });
}

async function addTask() {
    const task = {
        title: document.getElementById("title").value,
        description: document.getElementById("description").value,
        dueDate: document.getElementById("dueDate").value,
        completed: false
    };

    await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task)
    });

    loadTasks();
}

async function deleteTask(id) {
    await fetch(`${api}/${id}`, { method: "DELETE" });
    loadTasks();
}

loadTasks();
