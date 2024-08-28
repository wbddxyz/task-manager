document.addEventListener('DOMContentLoaded', () => {
    fetchTasks();
});

async function fetchTasks() {
    const response = await fetch('/tasks');
    const tasks = await response.json();
    const tasksDiv = document.getElementById('tasks');
    tasksDiv.innerHTML = tasks.map(task => `
        <div>
            <h3>${task.title}</h3>
            <p>${task.description}</p>
            <button onclick="deleteTask('${task._id}')">Delete</button>
        </div>
    `).join('');
}

document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    
    const response = await fetch('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
    });

    if (response.ok) {
        fetchTasks();
        document.getElementById('task-form').reset();
    }
});

async function deleteTask(id) {
    const response = await fetch(`/tasks/${id}`, { method: 'DELETE' });
    if (response.ok) fetchTasks();
}
