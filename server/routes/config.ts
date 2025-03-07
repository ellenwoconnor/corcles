
import { Router } from "express";
import logger from "../logger";

const router = Router();

router.get("/api/config", (req, res) => {
  try {
    logger.debug("Serving client configuration");
    
    // Only expose specific environment variables needed by the client
    const clientConfig = {
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.json(clientConfig);
  } catch (error) {
    logger.error("Error serving config:", error);
    res.status(500).json({ error: "Failed to retrieve configuration" });
  }
});

export default router;
