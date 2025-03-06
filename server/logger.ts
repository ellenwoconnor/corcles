import winston from 'winston';
import { join } from 'path';

// Custom format for detailed logging
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(
    ({ level, message, timestamp, ...metadata }) => {
      let msg = `${timestamp} [${level}] : ${message}`;
      if (Object.keys(metadata).length > 0 && metadata.stack) {
        msg += `\n${metadata.stack}`;
      } else if (Object.keys(metadata).length > 0) {
        msg += '\n' + JSON.stringify(metadata, null, 2);
      }
      return msg;
    }
  )
);

// Create logs directory if it doesn't exist
const logsDir = join(process.cwd(), 'logs');
try {
  require('fs').mkdirSync(logsDir);
} catch (e) {
  // Directory already exists
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // Default to info level regardless of environment
  format: customFormat,
  transports: [
    // Write all logs with importance level of 'error' or less to 'error.log'
    new winston.transports.File({
      filename: join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with importance level of 'info' or less to 'combined.log'
    new winston.transports.File({
      filename: join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Console transport with custom format
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'info', // Consistent level for console
    }),
  ],
});

// Create request logger middleware 
export const requestLogger = (req: any, res: any, next: any) => {
  // Log all requests in production, not just API requests
  const start = Date.now();

  // Only log debug details if explicitly set to debug level
  if (logger.level === 'debug') {
    logger.debug('Incoming request:', {
      method: req.method,
      url: req.url,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      body: req.method !== 'GET' ? req.body : undefined,
    });
  }

  // Log response details
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'error' : 'info';

    // Only log requests that are important (errors) or API endpoints
    if (res.statusCode >= 400 || req.url.startsWith('/api')) {
      logger[level]('Request:', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
      });
    }
  });

  next();
};

// Add startup logging function
export const logStartupInfo = () => {
  logger.info('Application startup information:', {
    nodeVersion: process.version,
    nodeEnv: process.env.NODE_ENV,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    memoryUsage: process.memoryUsage(),
    env: {
      port: process.env.PORT,
      hasDatabase: !!process.env.DATABASE_URL,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasSessionSecret: !!process.env.SESSION_SECRET
    }
  });
};

export default logger;