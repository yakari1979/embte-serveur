// src/index.js

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const dotenv = require('dotenv');

// Chargement des variables d'environnement
dotenv.config();

// Imports des routes
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const siteRoutes = require('./routes/siteRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes'); // <-- AJOUTER
const managerRoutes = require('./routes/managerRoutes'); // <-- IMPORT
const workerRoutes = require('./routes/workerRoutes'); // <-- IMPORT
const contactRoutes = require('./routes/contactRoutes'); // <-- IMPORT
const monitoringRoutes = require('./routes/monitoringRoutes');


const app = express();
const server = http.createServer(app);

// --- 1. CONFIGURATION ---
app.use(cors({
    origin: "*", // A changer par l'URL du frontend en production
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dossier public pour les uploads (photos chantiers, plans PDF)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- 2. ROUTE DE TEST ---
app.get('/', (req, res) => {
    res.status(200).send('🏗️ Serveur NexusBTP en ligne. Prêt à construire.');
});

// --- 3. SOCKET.IO (TEMPS RÉEL) ---
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    console.log(`🔌 Nouvelle connexion : ${socket.id}`);

    // Rejoindre la "room" d'un chantier spécifique
    socket.on('join_project', (projectId) => {
        socket.join(projectId);
        console.log(`Utilisateur a rejoint le chantier ${projectId}`);
    });

    // Écouter les mises à jour de tâches
    socket.on('task_update', (data) => {
        // Diffuser à tous ceux qui regardent ce chantier
        socket.to(data.projectId).emit('receive_task_update', data);
    });

    socket.on('disconnect', () => {
        console.log(`Déconnexion : ${socket.id}`);
    });
});

// Je rends io accessible dans les routes via req.app.get('io')
app.set('io', io); 

// --- 4. ROUTES API ---
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes); // Gestion administrative des projets
app.use('/api/site', siteRoutes);        // Gestion opérationnelle (Tâches, Rapports)
app.use('/api/client', orderRoutes);
app.use('/api/admin', adminRoutes); // <-- AJOUTER
app.use('/api/manager', managerRoutes); // <-- AJOUT
app.use('/api/worker', workerRoutes); // <-- AJOUT
app.use('/api/contact', contactRoutes); // <-- AJOUT
app.use('/api/monitoring', monitoringRoutes);

// ... listen

// --- 5. DÉMARRAGE --- pour faire en sorte uqe sa marche bien 
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 NEXUS BTP SERVER RUNNING ON PORT ${PORT}`);
    console.log(`=========================================`);
});