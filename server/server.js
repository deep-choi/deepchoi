
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

app.use(cors());
app.use(bodyParser.json());

// Helper to read DB
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading DB:', err);
        return { projects: [], users: [], comments: [] };
    }
};

// Helper to write DB
const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error writing DB:', err);
    }
};

// --- Projects API ---

// Get All Projects
app.get('/api/projects', (req, res) => {
    const db = readDB();
    res.json(db.projects);
});

// Get Single Project
app.get('/api/projects/:id', (req, res) => {
    const db = readDB();
    const project = db.projects.find(p => p.id === req.params.id);
    if (project) {
        res.json(project);
    } else {
        res.status(404).json({ message: 'Project not found' });
    }
});

// Create Project
app.post('/api/projects', (req, res) => {
    const db = readDB();
    const newProject = req.body;
    db.projects.push(newProject);
    writeDB(db);
    res.status(201).json(newProject);
});

// Update Project
app.put('/api/projects/:id', (req, res) => {
    const db = readDB();
    const index = db.projects.findIndex(p => p.id === req.params.id);
    if (index !== -1) {
        db.projects[index] = { ...db.projects[index], ...req.body };
        writeDB(db);
        res.json(db.projects[index]);
    } else {
        res.status(404).json({ message: 'Project not found' });
    }
});

// Delete Project
app.delete('/api/projects/:id', (req, res) => {
    const db = readDB();
    const newProjects = db.projects.filter(p => p.id !== req.params.id);
    if (newProjects.length !== db.projects.length) {
        db.projects = newProjects;
        writeDB(db);
        res.json({ message: 'Deleted successfully' });
    } else {
        res.status(404).json({ message: 'Project not found' });
    }
});

// --- Auth API ---

const ADMIN_EMAILS = ['cryingonion77@gmail.com'];

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email && u.password === password);
    const isLocalRequest = ['localhost', '127.0.0.1', '::1'].includes(req.hostname);

    if (user) {
        if (String(user.password || '').startsWith('google-')) {
            return res.status(401).json({ message: 'Use Google login for this account' });
        }
        if (user.role === 'admin' && !ADMIN_EMAILS.includes(user.email)) {
            return res.status(403).json({ message: 'Admin account is not allowed' });
        }
        res.json(user);
    } else {
        // Simple Google Login Simulation / Auto-registration for demo
        // If password is 'google-auth-mock-token', we treat it as Google Login
        if (password === 'google-auth-mock-token') {
            if (!isLocalRequest) {
                return res.status(403).json({ message: 'Local mock login is not allowed here' });
            }

            let googleUser = db.users.find(u => u.email === email);
            if (!googleUser) {
                // Register new Google User
                const isAdmin = ADMIN_EMAILS.includes(email);
                googleUser = {
                    email,
                    name: email.split('@')[0], // Simple name extraction
                    password: 'google-oauth-user',
                    role: isAdmin ? 'admin' : 'user',
                    avatarUrl: `https://ui-avatars.com/api/?name=${email.split('@')[0]}`
                };
                db.users.push(googleUser);
                writeDB(db);
            }
            if (googleUser.role === 'admin' && !ADMIN_EMAILS.includes(googleUser.email)) {
                return res.status(403).json({ message: 'Admin account is not allowed' });
            }
            return res.json(googleUser);
        }

        res.status(401).json({ message: 'Invalid credentials' });
    }
});

app.post('/api/auth/signup', (req, res) => {
    const { email, name, password } = req.body;
    const db = readDB();

    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = {
        email,
        name,
        password,
        role: 'user', // Default role for standard signup
        avatarUrl: `https://ui-avatars.com/api/?name=${name}`
    };

    db.users.push(newUser);
    writeDB(db);
    res.status(201).json(newUser);
});

// --- Comments API ---

app.get('/api/comments/:projectId', (req, res) => {
    const db = readDB();
    const comments = db.comments.filter(c => c.projectId === req.params.projectId);
    // Sort by date (newest first)
    comments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(comments);
});

app.post('/api/comments', (req, res) => {
    const db = readDB();
    const newComment = req.body;
    db.comments.push(newComment);
    writeDB(db);
    res.status(201).json(newComment);
});

app.delete('/api/comments/:id', (req, res) => {
    const db = readDB();
    const newComments = db.comments.filter(c => c.id !== req.params.id);
    db.comments = newComments;
    writeDB(db);
    res.json({ message: 'Comment deleted' });
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
