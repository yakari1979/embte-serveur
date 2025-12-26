const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Enregistrer une trace de connexion
exports.logConnection = async (req, res) => {
    try {
        const userId = req.user.id;
        const { deviceModel, os, browser, networkType, latitude, longitude, ipAddress } = req.body;

        await prisma.connectionLog.create({
            data: {
                userId,
                deviceModel,
                os,
                browser,
                networkType,
                ipAddress: ipAddress || req.ip, // On essaie de prendre l'IP envoyée ou celle de la requête
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null
            }
        });

        res.status(200).json({ message: "Trace enregistrée" });
    } catch (error) {
        console.error("Erreur log:", error);
        res.status(500).json({ message: "Erreur logging" });
    }
};

// 2. Récupérer l'historique pour l'Admin
exports.getMonitoringLogs = async (req, res) => {
    try {
        const logs = await prisma.connectionLog.findMany({
            include: {
                user: { select: { firstName: true, lastName: true, role: true, email: true } }
            },
            orderBy: { connectedAt: 'desc' },
            take: 100 // Les 100 dernières connexions
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};