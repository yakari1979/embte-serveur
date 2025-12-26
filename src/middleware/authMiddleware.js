// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // On récupère l'user sans le mot de passe
      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, firstName: true, lastName: true, email: true, role: true }
      });

      if (!req.user) {
          return res.status(401).json({ message: "Utilisateur introuvable." });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Non autorisé, token invalide.' });
    }
  } else {
    res.status(401).json({ message: 'Non autorisé, aucun token fourni.' });
  }
};

// Middleware pour restreindre l'accès à certains rôles (ex: Admin seulement)
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Accès refusé. Le rôle ${req.user.role} n'est pas autorisé.` 
            });
        }
        next();
    };
};

module.exports = { protect, authorize };