const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Dashboard
exports.getWorkerDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const worker = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                workingOnProjects: {
                    select: {
                        id: true, name: true, location: true, projectType: true, status: true,
                        manager: { select: { firstName: true, lastName: true, phone: true } }
                    }
                }
            }
        });

        res.json({
            profile: { firstName: worker.firstName, lastName: worker.lastName, jobTitle: worker.jobTitle },
            projects: worker.workingOnProjects || []
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Pointage
exports.clockIn = async (req, res) => {
    try {
        const { projectId, latitude, longitude } = req.body;
        const workerId = req.user.id;

        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

        const existing = await prisma.attendance.findFirst({
            where: {
                workerId, projectId,
                date: { gte: startOfDay, lte: endOfDay }
            }
        });

        if (existing) return res.status(400).json({ message: "Vous avez déjà pointé aujourd'hui." });

        const attendance = await prisma.attendance.create({
            data: { workerId, projectId, latitude, longitude }
        });

        res.status(201).json({ message: "Pointage réussi !", attendance });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur pointage." });
    }
};

// 3. Créer Rapport
exports.createReport = async (req, res) => {
    try {
        const { projectId, content, weather } = req.body;
        const authorId = req.user.id;
        
        let mediaFiles = [];
        if (req.files && req.files.length > 0) {
            mediaFiles = req.files.map(file => ({
                url: `/uploads/${file.filename}`,
                type: file.mimetype.startsWith('image') ? 'IMAGE' : 'DOC',
                name: file.originalname
            }));
        }

        const report = await prisma.dailyReport.create({
            data: {
                content, weather, projectId, authorId,
                media: JSON.stringify(mediaFiles),
                status: 'PENDING'
            }
        });

        res.status(201).json(report);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur envoi rapport." });
    }
};

// 4. Historique Rapports
exports.getMyReports = async (req, res) => {
    try {
        const userId = req.user.id;
        const reports = await prisma.dailyReport.findMany({
            where: { authorId: userId },
            include: {
                project: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};