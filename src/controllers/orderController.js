const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Envoyer une commande
exports.createOrder = async (req, res) => {
    try {
        const data = req.body;
        const userId = req.user.id;

        const projectName = data.projectType 
            ? `${data.projectType} à ${data.location || 'Dakar'}` 
            : `Projet de Client #${userId.substring(0, 5)}`;

        const project = await prisma.project.create({
            data: {
                name: projectName,
                clientId: userId,
                status: 'PENDING',
                
                projectType: data.projectType,
                objective: data.objective,
                urgency: data.urgency,
                
                location: data.location,
                surface: data.surface ? parseFloat(data.surface) : 0,
                landStatus: data.landStatus,
                legalStatus: data.legalStatus,
                isOwner: data.isOwner === 'true' || data.isOwner === true,
                
                zoneType: data.zoneType,
                accessType: data.accessType,
                utilities: JSON.stringify(data.utilities || []),
                
                buildingType: data.buildingType,
                floors: data.floors ? parseInt(data.floors) : 1,
                hasElevator: data.hasElevator === 'true' || data.hasElevator === true,
                soilStudy: data.soilStudy === 'true' || data.soilStudy === true,
                
                standing: data.standing,
                budget: data.budget ? parseFloat(data.budget) : 0,
                startDate: data.startDate ? new Date(data.startDate) : null,
                
                clientPhone: data.clientPhone,
                contactPref: data.contactPref,
                
                description: data.description || "Aucune description supplémentaire."
            }
        });

        return res.status(201).json(project);

    } catch (error) {
        console.error("Erreur création projet:", error);
        return res.status(500).json({ message: "Erreur lors de la création du projet.", error: error.message });
    }
};

// 2. Vérifier si j'ai un projet (CORRECTION ICI)
exports.getMyProject = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // On récupère le projet
        const project = await prisma.project.findFirst({
            where: { clientId: userId },
            include: {
                manager: {
                    select: { firstName: true, lastName: true, email: true, phone: true }
                },
                workers: {
                    select: { id: true, firstName: true, lastName: true, jobTitle: true, phone: true }
                },
                reports: {
                    where: { status: 'REVIEWED' },
                    orderBy: { createdAt: 'desc' }
                },
                tasks: {
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        // --- C'EST ICI QUE L'ERREUR SE PRODUISAIT ---
        if (!project) {
            return res.json(null); // On arrête tout avec 'return'
        }

        // On récupère les infos du client
        const clientInfo = await prisma.user.findUnique({
            where: { id: userId },
            select: { firstName: true, lastName: true, email: true }
        });
        
        // On envoie la réponse finale
        return res.json({ ...project, client: clientInfo });

    } catch (error) {
        console.error("Erreur getMyProject:", error);
        // On vérifie si une réponse a déjà été envoyée pour éviter le crash
        if (!res.headersSent) {
            return res.status(500).json({ message: error.message });
        }
    }
};

// 3. Récupérer la logistique pour le client
exports.getClientLogistics = async (req, res) => {
    try {
        const userId = req.user.id;

        const project = await prisma.project.findFirst({
            where: { clientId: userId }
        });

        if (!project) {
            return res.status(404).json({ message: "Aucun projet trouvé." });
        }

        const deliveries = await prisma.supplyRequest.findMany({
            where: { 
                projectId: project.id,
                status: 'DELIVERED'
            },
            // CORRECTION ICI : On trie par date de création car updatedAt n'existe pas
            orderBy: { createdAt: 'desc' } 
        });

        const inventory = await prisma.inventoryItem.findMany({
            where: { projectId: project.id }
        });

        return res.json({ deliveries, inventory });

    } catch (error) {
        console.error("Erreur logistique:", error);
        return res.status(500).json({ message: error.message });
    }
};