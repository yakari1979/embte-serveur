// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, jobTitle } = req.body;

        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) return res.status(400).json({ message: "Cet email est déjà utilisé." });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                firstName, lastName, email, role, jobTitle,
                password: hashedPassword
            }
        });

        res.status(201).json({
            message: "Utilisateur créé avec succès",
            token: generateToken(user.id),
            user: { id: user.id, email: user.email, role: user.role }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (user && (await bcrypt.compare(password, user.password))) {
            if (user.isSuspended) return res.status(403).json({ message: "Compte suspendu." });

            res.json({
                message: "Connexion réussie",
                token: generateToken(user.id),
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    jobTitle: user.jobTitle
                }
            });
        } else {
            res.status(401).json({ message: "Email ou mot de passe incorrect." });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};