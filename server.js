const express = require('express');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Setup Session for Login
app.use(session({
    secret: 'super-secret-key-jason',
    resave: false,
    saveUninitialized: true
}));

app.use(express.json());
// Serve the public folder and the uploads folder
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Setup Multer to save uploaded images to the 'uploads/' folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Database helper
const dataFile = './data.json';
function getData() {
    if (!fs.existsSync(dataFile)) return [];
    return JSON.parse(fs.readFileSync(dataFile));
}
function saveData(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// --- API ROUTES ---

// 1. Check if logged in
app.get('/api/auth/status', (req, res) => {
    res.json({ isLoggedIn: req.session.isLoggedIn === true });
});

// 2. Login
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    if (password === 'jason2026') { // YOUR PASSWORD HERE
        req.session.isLoggedIn = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Wrong password' });
    }
});

// 3. Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// 4. Get all projects
app.get('/api/projects', (req, res) => {
    res.json(getData());
});

// 5. Add a project (Requires Login)
app.post('/api/projects', upload.single('image'), (req, res) => {
    if (!req.session.isLoggedIn) return res.status(403).json({ error: 'Unauthorized' });
    
    const projects = getData();
    const newProject = {
        id: String(Date.now()),
        title: req.body.title,
        desc: req.body.desc,
        category: req.body.category,
        date: req.body.date,
        pinned: req.body.pinned === 'true',
        img: req.file ? '/uploads/' + req.file.filename : '' // Save the folder path!
    };
    
    projects.push(newProject);
    saveData(projects);
    res.json({ success: true, project: newProject });
});

// 6. Delete a project (Requires login)
app.delete('/api/projects/:id', (req, res) => {
    if (!req.session.isLoggedIn) return res.status(403).json({ error: 'Unauthorized' });
    let projects = getData();
    projects = projects.filter(p => p.id !== req.params.id);
    saveData(projects);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});