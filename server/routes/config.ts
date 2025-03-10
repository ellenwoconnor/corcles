import { Router } from "express";
import logger from "../logger";

const router = Router();

router.get("/api/config", (req, res) => {
  try {
    // Debug: Log the actual client ID (first 8 chars only for security)
    const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
    logger.info("Google Client ID check:", {
      value: googleClientId ? `${googleClientId.substring(0, 8)}...` : "missing",
      isString: typeof googleClientId === "string",
      length: googleClientId.length,
      envVars: Object.keys(process.env).filter(key => key.includes("GOOGLE")),
    });

    // Only expose non-sensitive environment variables
    const clientConfig = {
      googleClientId: googleClientId,
      environment: process.env.NODE_ENV,
      // Only enable Google OAuth in development or if client ID exists
      enableGoogleOAuth: process.env.NODE_ENV === 'development' || !!googleClientId,
    };

    logger.info("Serving client configuration", {
      configProvided: {
        hasGoogleClientId: !!clientConfig.googleClientId,
        googleClientIdLength: clientConfig.googleClientId ? clientConfig.googleClientId.length : 0,
        environment: clientConfig.environment,
      },
    });

    res.json(clientConfig);
  } catch (error) {
    logger.error("Error serving client configuration", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Failed to load configuration" });
  }
});

export default router;