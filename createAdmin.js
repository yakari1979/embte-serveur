// createAdmin.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'sdpinfosn@gmail.com';
    const password = 'Sakhom1979@';

    console.log(`⏳ Création du compte Admin pour : ${email}...`);

    // 1. Crypter le mot de passe (Indispensable pour que le login fonctionne)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. Créer ou Mettre à jour l'utilisateur (Upsert)
    // Si l'email existe déjà, il le transforme en ADMIN. Sinon, il le crée.
    const user = await prisma.user.upsert({
        where: { email: email },
        update: {
            role: 'ADMIN',
            password: hashedPassword, // Met à jour le mot de passe si le compte existait
            firstName: 'Super',
            lastName: 'Admin'
        },
        create: {
            email: email,
            password: hashedPassword,
            firstName: 'Super',
            lastName: 'Admin',
            role: 'ADMIN', // C'est ici qu'on définit le pouvoir !
            jobTitle: 'Directeur Général'
        }
    });

    console.log(`=============================================`);
    console.log(`✅ SUCCÈS ! Compte Administrateur prêt.`);
    console.log(`👤 Email : ${user.email}`);
    console.log(`🔑 Password : ${password}`);
    console.log(`🛡️ Rôle : ${user.role}`);
    console.log(`=============================================`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });