// src/controllers/projectController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Créer un nouveau chantier
exports.createProject = async (req, res) => {
    try {
        const { name, code, location, startDate, budget, managerId, clientName } = req.body;

        const project = await prisma.project.create({
            data: {
                name,
                code,
                location,
                startDate: new Date(startDate),
                budget: parseFloat(budget),
                managerId: managerId || req.user.id, // Si pas spécifié, c'est celui qui crée
                clientName,
                status: 'PLANNED'
            }
        });

        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ message: "Erreur création chantier", error: error.message });
    }
};

// Obtenir tous les chantiers (avec filtres selon rôle)
exports.getAllProjects = async (req, res) => {
    try {
        let whereClause = {};

        // Si c'est un ouvrier ou un manager, il ne voit que ses projets
        if (req.user.role === 'MANAGER') {
            whereClause = { managerId: req.user.id };
        }
        // Admin voit tout

        const projects = await prisma.project.findMany({
            where: whereClause,
            include: {
                manager: { select: { firstName: true, lastName: true } },
                _count: { select: { tasks: true, reports: true } } // Statistiques rapides
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Détails d'un chantier (Dashboard Projet)
exports.getProjectDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                tasks: { orderBy: { createdAt: 'desc' }, take: 5 }, // 5 dernières tâches
                manager: true,
                reports: { orderBy: { createdAt: 'desc' }, take: 3 }
            }
        });
        if (!project) return res.status(404).json({ message: "Chantier introuvable" });
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};