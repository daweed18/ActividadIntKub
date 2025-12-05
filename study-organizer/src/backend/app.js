const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

let tasks = [];
let id = 1;

// GET /
app.get("/", (req, res) => {
    res.send("Study Organizer API running – v2");
});

// GET /tasks
app.get("/tasks", (req, res) => {
    res.json(tasks);
});

// POST /tasks
app.post("/tasks", (req, res) => {
    const task = { id: id++, ...req.body };
    tasks.push(task);
    res.json(task);
});

// DELETE /tasks/:id
app.delete("/tasks/:id", (req, res) => {
    const taskId = parseInt(req.params.id);
    tasks = tasks.filter(t => t.id !== taskId);
    res.sendStatus(204);
});

app.listen(8080, () => console.log("API running on port 8080"));
