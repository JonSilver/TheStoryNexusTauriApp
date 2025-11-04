import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { runMigrations } from './db/migrate';
import { seedSystemPrompts } from './db/seedSystemPrompts';

// Import routes
import storiesRouter from './routes/stories';
import chaptersRouter from './routes/chapters';
import lorebookRouter from './routes/lorebook';
import promptsRouter from './routes/prompts';
import aiRouter from './routes/ai';
import brainstormRouter from './routes/brainstorm';
import scenebeatsRouter from './routes/scenebeats';
import notesRouter from './routes/notes';
import adminRouter from './routes/admin';

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Run migrations and seed system prompts on startup
const initializeDatabase = async () => {
    runMigrations();
    await seedSystemPrompts();
};

initializeDatabase().catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS - allow all in development, restrict in production if needed
if (NODE_ENV === 'development') {
    app.use(cors());
}

// API routes
app.use('/api/stories', storiesRouter);
app.use('/api/chapters', chaptersRouter);
app.use('/api/lorebook', lorebookRouter);
app.use('/api/prompts', promptsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/brainstorm', brainstormRouter);
app.use('/api/scenebeats', scenebeatsRouter);
app.use('/api/notes', notesRouter);
app.use('/api/admin', adminRouter);

// Serve static files in production
if (NODE_ENV === 'production') {
    const staticPath = path.join(__dirname, '../dist/client');
    app.use(express.static(staticPath));

    // Serve index.html for all non-API routes (SPA routing)
    app.get('*', (req, res) => {
        res.sendFile(path.join(staticPath, 'index.html'));
    });
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});
