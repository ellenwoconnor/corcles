import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import logger, { requestLogger } from "./logger";
import { db } from "./db";
import { sql } from 'drizzle-orm';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request logging middleware
app.use(requestLogger);

async function startServer() {
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);
    logger.info('Database connection successful');

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      logger.error('Server error:', { 
        status,
        message,
        stack: err.stack
      });

      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = Number(process.env.PORT || 5000);
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server started on port ${PORT} and bound to all interfaces`);
    });

    // Handle server startup errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server startup error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    // Only exit for critical errors
    if (error.code === 'EACCES' || error.code === 'EADDRINUSE') {
      logger.error('Critical error - exiting process');
      process.exit(1);
    } else {
      logger.error('Attempting to recover from error');
    }
  }
}

startServer().catch((error) => {
  logger.error('Unhandled server startup error:', error);
  process.exit(1);
});