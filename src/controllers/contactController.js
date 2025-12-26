const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.submitContact = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, location, latitude, longitude, subject, message } = req.body;

        // Validation simple
        if (!email || !message || !subject) {
            return res.status(400).json({ message: "Champs obligatoires manquants." });
        }

        const contact = await prisma.contactRequest.create({
            data: {
                firstName,
                lastName,
                email,
                phone,
                location,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                subject, // Doit correspondre à l'enum (RECLAMATION, RENDEZ_VOUS, AUTRE)
                message
            }
        });

        res.status(201).json({ message: "Message envoyé avec succès !", contact });

    } catch (error) {
        console.error("Erreur Contact:", error);
        res.status(500).json({ message: "Erreur serveur." });
    }
};