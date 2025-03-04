import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import logger, { requestLogger, logStartupInfo } from "./logger";
import { db } from "./db";
import { sql } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(requestLogger);

async function startServer() {
  try {
    // Log detailed startup information
    logStartupInfo();

    // Log directory structure for debugging
    const projectRoot = process.cwd();
    logger.info('Project directory structure:', {
      projectRoot,
      hasDistDir: fs.existsSync(path.join(projectRoot, 'dist')),
      hasPublicDir: fs.existsSync(path.join(projectRoot, 'public')),
      hasClientDistDir: fs.existsSync(path.join(projectRoot, 'client', 'dist')),
      nodeEnv: process.env.NODE_ENV
    });

    // Validate required environment variables
    const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Test database connection first
    try {
      await db.execute(sql`SELECT 1`);
      logger.info('Database connection successful');
    } catch (dbError) {
      logger.error('Database connection failed:', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined
      });
      throw dbError;
    }

    // Register routes
    logger.info('Registering application routes...');
    const server = await registerRoutes(app);
    logger.info('Routes registered successfully');

    // Global error handler - MUST be after routes
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      logger.error('Server error:', { 
        status,
        message,
        stack: err.stack,
        name: err.name,
        code: err.code
      });

      // Don't expose internal errors in production
      const responseMessage = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : message;

      res.status(status).json({ error: responseMessage });
    });

    // Setup environment-specific middleware
    if (process.env.NODE_ENV === 'development') {
      logger.info('Setting up development environment with Vite');
      await setupVite(app, server);
    } else {
      logger.info('Setting up production environment');
      // Check all possible static file locations
      const possiblePaths = [
        path.join(process.cwd(), 'public'),
        path.join(process.cwd(), 'dist', 'public'),
        path.join(process.cwd(), 'dist'),
        path.join(process.cwd(), 'client', 'dist')
      ];

      logger.info('Checking possible static file locations:', {
        paths: possiblePaths.map(p => ({
          path: p,
          exists: fs.existsSync(p),
          hasIndex: fs.existsSync(path.join(p, 'index.html'))
        }))
      });

      // Use direct path to static files without symbolic links
      const publicDir = path.join(process.cwd(), 'dist', 'public');
      
      logger.info('Static files directory:', {
        publicDir,
        exists: fs.existsSync(publicDir),
        hasIndex: fs.existsSync(path.join(publicDir, 'index.html'))
      });

      serveStatic(app);
    }

    // Start server with proper port binding
    const PORT = Number(process.env.PORT || 5000);

    await new Promise<void>((resolve, reject) => {
      server.listen(PORT, '0.0.0.0', () => {
        const address = server.address();
        logger.info('Server started successfully:', {
          port: PORT,
          env: process.env.NODE_ENV,
          address: typeof address === 'string' ? address : JSON.stringify(address)
        });
        resolve();
      });

      server.on('error', (error: any) => {
        logger.error('Server startup error:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
        reject(error);
      });
    });

  } catch (error) {
    logger.error('Fatal error during server startup:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

export function serveStatic(app: express.Application) {
  const staticDir = path.resolve(process.cwd(), "dist/public");

  // Serve static files
  app.use(express.static(staticDir));

  // For all routes, read and modify the HTML to inject environment variables
  app.get("*", (req, res) => {
    const indexPath = path.resolve(staticDir, "index.html");
    let html = fs.readFileSync(indexPath, "utf8");

    // Properly escape the environment variable to prevent XSS
    const googleClientId = process.env.GOOGLE_CLIENT_ID ? 
      JSON.stringify(process.env.GOOGLE_CLIENT_ID) : 
      '""';

    // Inject environment variables into the HTML
    html = html.replace(
      "</head>",
      `<script>
        window.env = window.env || {};
        window.env.GOOGLE_CLIENT_ID = ${googleClientId};
      </script></head>`
    );

    res.send(html);
  });
}

startServer().catch((error) => {
  logger.error('Server startup failed:', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
});