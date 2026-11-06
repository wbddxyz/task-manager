const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const pool = mysql.createPool({
    host: process.env.MYSQLHOST || 'localhost',
    port: Number(process.env.MYSQLPORT || 3306),
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initialiseDatabase() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS task_manager_tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            completed BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('Task Manager database table ready');
}

app.post('/tasks', async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Task title is required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO task_manager_tasks (title, description) VALUES (?, ?)',
            [title.trim(), description || null]
        );

        const [rows] = await pool.execute(
            'SELECT id AS _id, title, description, completed, created_at FROM task_manager_tasks WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating task:', err);
        res.status(500).json({ error: 'Could not create task' });
    }
});

app.get('/tasks', async (req, res) => {
    try {
        const [tasks] = await pool.execute(
            'SELECT id AS _id, title, description, completed, created_at FROM task_manager_tasks ORDER BY created_at DESC'
        );

        res.json(tasks);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).json({ error: 'Could not fetch tasks' });
    }
});

app.get('/tasks/:id', async (req, res) => {
    try {
        const [tasks] = await pool.execute(
            'SELECT id AS _id, title, description, completed, created_at FROM task_manager_tasks WHERE id = ?',
            [req.params.id]
        );

        if (!tasks.length) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(tasks[0]);
    } catch (err) {
        console.error('Error fetching task:', err);
        res.status(500).json({ error: 'Could not fetch task' });
    }
});

app.patch('/tasks/:id', async (req, res) => {
    try {
        const { title, description, completed } = req.body;
        const updates = [];
        const values = [];

        if (title !== undefined) {
            if (typeof title !== 'string' || !title.trim()) {
                return res.status(400).json({ error: 'Title cannot be empty' });
            }
            updates.push('title = ?');
            values.push(title.trim());
        }

        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }

        if (completed !== undefined) {
            updates.push('completed = ?');
            values.push(completed);
        }

        if (!updates.length) {
            return res.status(400).json({ error: 'No valid fields provided' });
        }

        values.push(req.params.id);

        const [result] = await pool.execute(
            `UPDATE task_manager_tasks SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const [tasks] = await pool.execute(
            'SELECT id AS _id, title, description, completed, created_at FROM task_manager_tasks WHERE id = ?',
            [req.params.id]
        );

        res.json(tasks[0]);
    } catch (err) {
        console.error('Error updating task:', err);
        res.status(500).json({ error: 'Could not update task' });
    }
});

app.delete('/tasks/:id', async (req, res) => {
    try {
        const [tasks] = await pool.execute(
            'SELECT id AS _id, title, description, completed, created_at FROM task_manager_tasks WHERE id = ?',
            [req.params.id]
        );

        if (!tasks.length) {
            return res.status(404).json({ error: 'Task not found' });
        }

        await pool.execute(
            'DELETE FROM task_manager_tasks WHERE id = ?',
            [req.params.id]
        );

        res.json(tasks[0]);
    } catch (err) {
        console.error('Error deleting task:', err);
        res.status(500).json({ error: 'Could not delete task' });
    }
});

app.use(express.static(path.join(__dirname, 'public')));

initialiseDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Database initialisation failed:', err);
        process.exit(1);
    });
