const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // N'oublie pas d'importer bcrypt si ce n'est pas fait
const prisma = new PrismaClient();

// Récupérer le dashboard personnel du Manager
exports.getManagerDashboard = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Récupérer les infos du Manager
        const me = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, jobTitle: true, createdAt: true }
        });

        // 2. Récupérer les projets assignés (IN_PROGRESS ou PLANNED)
        const myProjects = await prisma.project.findMany({
            where: { 
                managerId: userId,
                status: { in: ['IN_PROGRESS', 'PLANNED'] }
            },
            include: {
                _count: { select: { tasks: true, reports: true } } // Pour les stats rapides
            },
            orderBy: { updatedAt: 'desc' }
        });

        // 3. Calculer quelques stats rapides
        const totalTasks = myProjects.reduce((acc, proj) => acc + proj._count.tasks, 0);
        
        res.json({
            profile: me,
            projects: myProjects,
            stats: {
                activeProjects: myProjects.length,
                pendingTasks: totalTasks
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Récupérer les équipes par projet
exports.getManagerTeams = async (req, res) => {
    try {
        const userId = req.user.id;

        const projects = await prisma.project.findMany({
            where: { 
                managerId: userId,
                status: 'IN_PROGRESS' 
            },
            select: {
                id: true,
                name: true,
                location: true,
                projectType: true,
                workers: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        jobTitle: true,
                        createdAt: true
                    }
                }
            }
        });

        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// 3. Créer un compte OUVRIER (WORKER)
exports.createWorker = async (req, res) => {
    try {
        console.log("📥 Données reçues:", req.body); // Pour le debug

        const { firstName, lastName, email, phone, jobTitle, projectId } = req.body;

        // 1. Validation de base
        if (!email || !firstName || !lastName) {
            return res.status(400).json({ message: "Nom, Prénom et Email sont obligatoires." });
        }

        // 2. Vérifier si l'email existe déjà
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ message: "Cet email est déjà utilisé par un autre utilisateur." });
        }

        // 3. Génération du mot de passe
        const rawPassword = Math.random().toString(36).slice(-8) + "1!";
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        // 4. Préparation de la connexion au projet (Seulement si un ID valide est fourni)
        let projectConnection = undefined;
        if (projectId && projectId.length > 0) {
            // Vérifier si le projet existe vraiment pour éviter une erreur Prisma
            const projectExists = await prisma.project.findUnique({ where: { id: projectId } });
            if (projectExists) {
                projectConnection = { connect: { id: projectId } };
            }
        }

        // 5. Création
        const worker = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                phone,
                jobTitle,
                role: 'WORKER',
                password: hashedPassword,
                // On connecte seulement si c'est défini
                workingOnProjects: projectConnection
            }
        });

        console.log("✅ Ouvrier créé:", worker.id);
        res.status(201).json({ user: worker, generatedPassword: rawPassword });

    } catch (error) {
        console.error("❌ Erreur Create Worker:", error);
        // On renvoie l'erreur exacte pour aider au débogage
        res.status(500).json({ message: "Erreur serveur : " + error.message });
    }
};

// 4. Récupérer les rapports des chantiers gérés par le manager
exports.getManagerReports = async (req, res) => {
    try {
        const managerId = req.user.id;

        const reports = await prisma.dailyReport.findMany({
            where: {
                project: { managerId: managerId } // Seulement mes projets
            },
            include: {
                project: { select: { name: true, location: true } },
                author: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 5. Valider un rapport (Marquer comme Vu)
exports.validateReport = async (req, res) => {
    try {
        const { reportId } = req.params;

        const updatedReport = await prisma.dailyReport.update({
            where: { id: reportId },
            data: { status: 'REVIEWED' }
        });

        res.json(updatedReport);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 6. Mettre à jour l'avancement du projet
exports.updateProjectProgress = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { progress } = req.body; // Un nombre entre 0 et 100

        // Vérification basique
        if (progress < 0 || progress > 100) {
            return res.status(400).json({ message: "Le pourcentage doit être entre 0 et 100." });
        }

        const project = await prisma.project.update({
            where: { id: projectId },
            data: { progress: parseInt(progress) }
        });

        res.json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// 7. Récupérer les détails d'un projet (Sécurisé pour le Manager)
exports.getManagerProjectDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const managerId = req.user.id;

        const project = await prisma.project.findFirst({
            where: { 
                id: id,
                managerId: managerId 
            },
            include: {
                workers: true // On a déjà les ouvriers
            }
        });

        if (!project) {
            return res.status(404).json({ message: "Projet introuvable." });
        }

        // AJOUT : Récupérer les infos du Client
        let client = null;
        if (project.clientId) {
            client = await prisma.user.findUnique({
                where: { id: project.clientId },
                select: { firstName: true, lastName: true, email: true, phone: true }
            });
        }

        res.json({ ...project, client }); // On renvoie le tout

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 8. Créer une nouvelle tâche
exports.createTask = async (req, res) => {
    try {
        const { projectId, title, description, priority, dueDate, assignedToId } = req.body;

        const task = await prisma.task.create({
            data: {
                title,
                description,
                priority,
                projectId,
                assignedToId: assignedToId || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                status: 'TODO'
            }
        });

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 9. Récupérer les tâches d'un projet
exports.getProjectTasks = async (req, res) => {
    try {
        const { projectId } = req.params;
        const tasks = await prisma.task.findMany({
            where: { projectId },
            include: {
                assignedTo: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 10. Mettre à jour une tâche (Statut)
exports.updateTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body; // TODO, IN_PROGRESS, DONE

        const task = await prisma.task.update({
            where: { id: taskId },
            data: { status }
        });
        
        // Si la tâche est finie, on pourrait recalculer le % du projet ici (Bonus)
        
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// ...

// 11. Récupérer le stock et les demandes d'un projet
exports.getProjectLogistics = async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const inventory = await prisma.inventoryItem.findMany({
            where: { projectId }
        });

        const requests = await prisma.supplyRequest.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ inventory, requests });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 12. Créer une demande de matériel
exports.createSupplyRequest = async (req, res) => {
    try {
        const { projectId, itemName, quantity, unit, urgency, note } = req.body;
        const requesterId = req.user.id;

        const request = await prisma.supplyRequest.create({
            data: { projectId, itemName, quantity: parseInt(quantity), unit, urgency, note, requesterId }
        });

        res.status(201).json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 13. Valider une réception (Mettre à jour le stock)
exports.receiveSupply = async (req, res) => {
    try {
        const { requestId } = req.params;
        
        // 1. Récupérer la demande
        const request = await prisma.supplyRequest.findUnique({ where: { id: requestId } });
        
        // 2. Mettre à jour le statut
        await prisma.supplyRequest.update({
            where: { id: requestId },
            data: { status: 'DELIVERED' }
        });

        // 3. Ajouter au stock (Upsert : Créer si existe pas, sinon ajouter)
        const existingItem = await prisma.inventoryItem.findFirst({
            where: { projectId: request.projectId, name: request.itemName }
        });

        if (existingItem) {
            await prisma.inventoryItem.update({
                where: { id: existingItem.id },
                data: { quantity: existingItem.quantity + request.quantity }
            });
        } else {
            await prisma.inventoryItem.create({
                data: {
                    name: request.itemName,
                    quantity: request.quantity,
                    unit: request.unit,
                    category: 'Général',
                    minThreshold: 5,
                    projectId: request.projectId
                }
            });
        }

        res.json({ message: "Stock mis à jour" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 11. Initialiser ou Ajouter du Stock (Setup)
exports.addInventoryItem = async (req, res) => {
    try {
        const { projectId, name, category, quantity, unit, type, minThreshold } = req.body;
        
        const item = await prisma.inventoryItem.create({
            data: {
                projectId,
                name,
                category,
                quantity: parseInt(quantity),
                initialQuantity: parseInt(quantity), // Au départ, initial = actuel
                unit,
                type, // CONSUMABLE ou EQUIPMENT
                minThreshold: parseInt(minThreshold) || 5
            }
        });
        
        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 12. Enregistrer une utilisation (Tracking)
exports.recordStockUsage = async (req, res) => {
    try {
        const { itemId, quantity, action, note } = req.body;
        const userId = req.user.id;
        const qty = parseInt(quantity);

        // 1. Vérifier le stock
        const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
        
        if (!item) return res.status(404).json({ message: "Article introuvable" });
        
        // Logique : USAGE et LOSS diminuent le stock, RESTOCK et RETURN l'augmentent
        let newQuantity = item.quantity;
        if (action === 'USAGE' || action === 'LOSS') {
            if (item.quantity < qty) return res.status(400).json({ message: "Stock insuffisant !" });
            newQuantity -= qty;
        } else {
            newQuantity += qty;
            // Si c'est un RESTOCK, on augmente aussi le "total vu" (initialQuantity est un peu impropre ici, disons "Total Acquis")
            if (action === 'RESTOCK') {
                await prisma.inventoryItem.update({
                    where: { id: itemId },
                    data: { initialQuantity: item.initialQuantity + qty }
                });
            }
        }

        // 2. Mise à jour atomique (Transaction)
        const [updatedItem, log] = await prisma.$transaction([
            prisma.inventoryItem.update({
                where: { id: itemId },
                data: { quantity: newQuantity }
            }),
            prisma.inventoryLog.create({
                data: {
                    itemId,
                    userId,
                    action,
                    quantity: qty,
                    note
                }
            })
        ]);

        res.json({ updatedItem, log });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 13. Récupérer l'historique complet
exports.getInventoryDetails = async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const inventory = await prisma.inventoryItem.findMany({
            where: { projectId },
            include: {
                logs: {
                    orderBy: { date: 'desc' },
                    take: 10, // Les 10 derniers mouvements
                    include: { user: { select: { firstName: true, lastName: true } } }
                }
            }
        });
        
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};