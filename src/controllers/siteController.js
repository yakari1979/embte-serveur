// src/controllers/siteController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Ajouter une tâche
exports.addTask = async (req, res) => {
    try {
        const { title, priority, projectId, assignedToId, dueDate } = req.body;
        
        const task = await prisma.task.create({
            data: {
                title,
                priority,
                projectId,
                assignedToId,
                dueDate: dueDate ? new Date(dueDate) : null,
                status: 'TODO'
            },
            include: { assignedTo: { select: { firstName: true, lastName: true } } }
        });

        // Notification temps réel via Socket.IO
        const io = req.app.get('io');
        io.to(projectId).emit('new_task', task);

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mettre à jour une tâche (Drag & Drop kanban)
exports.updateTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body; // TODO, IN_PROGRESS, DONE

        const task = await prisma.task.update({
            where: { id: taskId },
            data: { status }
        });
        
        // Notif
        const io = req.app.get('io');
        io.to(task.projectId).emit('task_updated', task);

        res.json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Créer un rapport journalier (avec photo optionnelle)
exports.createDailyReport = async (req, res) => {
    try {
        const { content, weather, projectId } = req.body;
        
        // Si une image est uploadée via Multer
        let photoUrl = null;
        if (req.file) {
            photoUrl = `/uploads/${req.file.filename}`;
        }

        const report = await prisma.dailyReport.create({
            data: {
                content,
                weather,
                projectId,
                authorId: req.user.id,
                photos: photoUrl
            },
            include: { author: { select: { firstName: true, lastName: true } } }
        });

        res.status(201).json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};