// scripts/createAdmin.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = "sdpinfosn@gmail.com";
  const password = "Sakhom1979@";

  console.log("🚀 Tentative de création du compte admin...");

  try {
    // 1. On vérifie si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    });

    if (existingUser) {
      console.log("⚠️ Un utilisateur avec cet email existe déjà.");
      return;
    }

    // 2. On hache le mot de passe (IMPORTANT)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. On crée l'admin dans la base de données
    const admin = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        firstName: "Admin",
        lastName: "Nexus",
        role: "ADMIN", // Utilise bien le rôle ADMIN défini dans ton schema.prisma
        jobTitle: "Directeur Général",
      }
    });

    console.log("✅ Compte Admin créé avec succès !");
    console.log("Email:", admin.email);
    console.log("Rôle:", admin.role);

  } catch (error) {
    console.error("❌ Erreur lors de la création de l'admin :", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();