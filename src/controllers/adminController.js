const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

// 1. Récupérer les stats globales et les projets en attente
exports.getDashboardData = async (req, res) => {
    try {
        const totalProjects = await prisma.project.count();
        const pendingProjects = await prisma.project.count({ where: { status: 'PENDING' } });
        const activeProjects = await prisma.project.count({ where: { status: 'IN_PROGRESS' } });
        const totalUsers = await prisma.user.count({ where: { role: 'CLIENT' } });
        // AJOUT ICI : Compter les demandes de matériel en attente
        const pendingLogistics = await prisma.supplyRequest.count({ where: { status: 'PENDING' } });

        // AJOUT ICI : Compter les nouveaux messages
        const newContacts = await prisma.contactRequest.count({ where: { status: 'NEW' } });

        const recentOrders = await prisma.project.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        res.json({
            stats: { totalProjects, pendingProjects, activeProjects, totalUsers, newContacts },
            recentOrders,pendingLogistics
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Valider (ou Rejeter) un projet
exports.updateProjectStatus = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { status } = req.body; 

        const updatedProject = await prisma.project.update({
            where: { id: projectId },
            data: { status }
        });

        res.json(updatedProject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Récupérer les détails d'un projet spécifique (VERSION MISE A JOUR) pour les ection fonctionnelle 
exports.getProjectDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                // ICI : On inclut les ouvriers pour la page de gestion !
                workers: {
                    select: {
                        id: true, firstName: true, lastName: true, jobTitle: true, phone: true
                    }
                }
            }
        });
        
        if (!project) {
            return res.status(404).json({ message: "Projet introuvable" });
        }

        let client = null;
        if (project.clientId) {
            client = await prisma.user.findUnique({
                where: { id: project.clientId },
                select: { id: true, firstName: true, lastName: true, email: true, phone: true }
            });
        }
        
        res.json({ ...project, client });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Récupérer les utilisateurs par rôle personelle de cette fonctionnaliter aussi 
exports.getUsersByRole = async (req, res) => {
    try {
        const { role } = req.query; 
        const users = await prisma.user.findMany({
            where: { role: role },
            select: {
                id: true, firstName: true, lastName: true, email: true, 
                phone: true, jobTitle: true, isSuspended: true, createdAt: true,
                _count: { select: { managedProjects: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 5. Récupérer les projets actifs
exports.getActiveProjects = async (req, res) => {
    try {
        const projects = await prisma.project.findMany({
            where: { status: { in: ['PLANNED', 'IN_PROGRESS'] } },
            include: {
                manager: { select: { firstName: true, lastName: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 6. Assigner un Manager à un projet
exports.assignManager = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { managerId } = req.body;

        const project = await prisma.project.update({
            where: { id: projectId },
            data: { 
                managerId: managerId,
                status: 'IN_PROGRESS' 
            }
        });
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 7. Créer un Manager et auss une client s'il le faute aussi 
exports.createManager = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, jobTitle } = req.body;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ message: "Cet email est déjà utilisé." });

        const rawPassword = Math.random().toString(36).slice(-8) + "Aa1@";
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const newUser = await prisma.user.create({
            data: {
                firstName, lastName, email, phone, jobTitle,
                role: 'MANAGER',
                password: hashedPassword
            }
        });

        res.status(201).json({ user: newUser, generatedPassword: rawPassword });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 8. Détails utilisateur
exports.getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { managedProjects: true }
        });

        const clientProjects = await prisma.project.findMany({
            where: { clientId: userId }
        });

        res.json({ ...user, clientProjects });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 9. Récupérer tous les messages de contact
exports.getAllContacts = async (req, res) => {
    try {
        const contacts = await prisma.contactRequest.findMany({
            orderBy: [
                { status: 'asc' }, // Les 'NEW' en premier (ordre alphabétique N avant R)
                { createdAt: 'desc' } // Les plus récents ensuite
            ]
        });
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 10. Marquer un message comme LU (Epingler/Archiver)
exports.markContactAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        
        const contact = await prisma.contactRequest.update({
            where: { id },
            data: { status: 'READ' }
        });
        
        res.json(contact);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.getAnalyticsData = async (req, res) => {
    try {
        // 1. Répartition des Projets par Statut (Pie Chart)
        const projectsByStatus = await prisma.project.groupBy({
            by: ['status'],
            _count: { id: true }
        });

        // 2. Budget Total vs Dépenses (Simulation basée sur le progrès) (Bar Chart)
        // Dans un vrai cas, on ferait la somme des factures. Ici on simule avec budget * progress
        const projects = await prisma.project.findMany({
            select: { name: true, budget: true, progress: true }
        });

        const budgetData = projects.map(p => ({
            name: p.name.substring(0, 10) + '...', // Nom court
            budget: p.budget,
            spent: (p.budget * p.progress) / 100 // Estimation dépense
        })).slice(0, 5); // Top 5 projets

        // 3. Tâches par statut (Doughnut)
        const tasksStats = await prisma.task.groupBy({
            by: ['status'],
            _count: { id: true }
        });

        // 4. Activité Ouvriers (Derniers 7 jours) (Area Chart)
        // On simule une courbe d'activité réaliste basée sur les pointages
        // (Pour l'exemple, car la requête SQL date complexe dépend de la DB)
        const activityData = [
            { day: 'Lun', workers: 12 },
            { day: 'Mar', workers: 18 },
            { day: 'Mer', workers: 15 },
            { day: 'Jeu', workers: 22 },
            { day: 'Ven', workers: 20 },
            { day: 'Sam', workers: 10 },
            { day: 'Dim', workers: 2 },
        ];

        res.json({
            projectStatus: projectsByStatus,
            budgetData: budgetData,
            taskStats: tasksStats,
            activityData: activityData
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ...

// 12. Récupérer toutes les demandes logistiques
exports.getAllSupplyRequests = async (req, res) => {
    try {
        const requests = await prisma.supplyRequest.findMany({
            include: {
                project: { select: { name: true, location: true } },
                requester: { select: { firstName: true, lastName: true } }
            },
            orderBy: [
                { urgency: 'desc' }, // Les urgences d'abord
                { createdAt: 'desc' }
            ]
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 13. Mettre à jour le statut d'une demande (Validation Admin)
exports.updateSupplyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // ORDERED, REJECTED

        const updatedRequest = await prisma.supplyRequest.update({
            where: { id },
            data: { status }
        });
        
        res.json(updatedRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// 14. Récupérer l'inventaire complet d'un projet (Vue Admin)
exports.getProjectInventoryAdmin = async (req, res) => {
    try {
        const { projectId } = req.params;

        const inventory = await prisma.inventoryItem.findMany({
            where: { projectId },
            include: {
                logs: {
                    orderBy: { date: 'desc' },
                    take: 20, // On prend les 20 derniers mouvements
                    include: { user: { select: { firstName: true, lastName: true, role: true } } }
                }
            }
        });

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { name: true, location: true }
        });

        res.json({ project, inventory });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};





