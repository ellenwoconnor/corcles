import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import logger, { requestLogger, logStartupInfo } from "./logger";
import { db } from "./db";
import { sql } from "drizzle-orm";
import path from "path";
import fs from "fs";

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
    logger.info("Project directory structure:", {
      projectRoot,
      hasDistDir: fs.existsSync(path.join(projectRoot, "dist")),
      hasPublicDir: fs.existsSync(path.join(projectRoot, "public")),
      hasClientDistDir: fs.existsSync(path.join(projectRoot, "client", "dist")),
      nodeEnv: process.env.NODE_ENV,
    });

    // Validate required environment variables
    const requiredEnvVars = [
      "DATABASE_URL",
      "SESSION_SECRET",
      "GOOGLE_CLIENT_ID",
    ];
    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName],
    );

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(", ")}`,
      );
    }

    // Test database connection first
    try {
      await db.execute(sql`SELECT 1`);
      logger.info("Database connection successful");
    } catch (dbError) {
      logger.error("Database connection failed:", {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined,
      });
      throw dbError;
    }

    // Register routes
    logger.info("Registering application routes...");
    const server = await registerRoutes(app);
    logger.info("Routes registered successfully");

    // Global error handler - MUST be after routes
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      logger.error("Server error:", {
        status,
        message,
        stack: err.stack,
        name: err.name,
        code: err.code,
      });

      // Don't expose internal errors in production
      const responseMessage =
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : message;

      res.status(status).json({ error: responseMessage });
    });

    // Setup environment-specific middleware
    if (process.env.NODE_ENV === "development") {
      logger.info("Setting up development environment with Vite");
      await setupVite(app, server);
    } else {
      logger.info("Setting up production environment");
      const staticDir = path.resolve(process.cwd(), "dist/public");

      // Check if static directory exists, otherwise create it
      if (!fs.existsSync(staticDir)) {
        logger.warn("Static directory does not exist, creating it:", {
          staticDir
        });
        try {
          fs.mkdirSync(staticDir, { recursive: true });
        } catch (error) {
          logger.error("Error creating static directory:", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
        }
      }
      
      logger.info("Static files directory:", {
        staticDir,
        exists: fs.existsSync(staticDir),
        hasIndex: fs.existsSync(path.join(staticDir, "index.html")),
      });

      // Serve static files
      app.use(express.static(staticDir));

      // For all routes, serve the static HTML or fallback to a simple message
      app.get("*", (req, res) => {
        const indexPath = path.resolve(staticDir, "index.html");
        
        // Debug environment variables without exposing them
        logger.info("Environment configuration status:", {
          hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
          googleClientIdLength: process.env.GOOGLE_CLIENT_ID
            ? process.env.GOOGLE_CLIENT_ID.length
            : 0,
          environment: process.env.NODE_ENV,
          isProduction: process.env.NODE_ENV === "production",
        });

        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          logger.warn("index.html not found, sending fallback response");
          res.status(200).send("Server is running, but client files are not available.");
        }
      });
    }

    // Start server with proper port binding
    const PORT = Number(process.env.PORT || 5000);

    await new Promise<void>((resolve, reject) => {
      try {
        server.listen(PORT, "0.0.0.0", () => {
          const address = server.address();
          logger.info("Server started successfully:", {
            port: PORT,
            env: process.env.NODE_ENV,
            address:
              typeof address === "string" ? address : JSON.stringify(address),
          });
          resolve();
        });

        server.on("error", (error: any) => {
          logger.error("Server startup error:", {
            code: error.code,
            message: error.message,
            stack: error.stack,
          });
          reject(error);
        });
      } catch (error) {
        logger.error("Unexpected error during server.listen:", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        reject(error);
      }
    });
  } catch (error) {
    logger.error("Fatal error during server startup:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Handle uncaught errors
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise,
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

startServer().catch((error) => {
  logger.error("Server startup failed:", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
