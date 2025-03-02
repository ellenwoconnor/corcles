
import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';

// Check for required environment variables
const requiredEnvVars = [
  'DO_SPACES_KEY',
  'DO_SPACES_SECRET',
  'DO_SPACES_NAME',
  'DO_SPACES_ENDPOINT'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.warn(`Missing Digital Ocean Spaces environment variables: ${missingVars.join(', ')}`);
  logger.warn('Image uploads will not work with Digital Ocean Spaces');
}

// Configure endpoint - use environment variable or fallback to default
const endpoint = process.env.DO_SPACES_ENDPOINT || 'https://sfo2.digitaloceanspaces.com';
logger.info(`Using Digital Ocean Spaces endpoint: ${endpoint}`);

// Initialize the S3 client for Digital Ocean Spaces
const s3Client = new S3Client({
  endpoint: endpoint,
  region: 'us-east-1', // DigitalOcean Spaces default region
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || ''
  }
});

// Create a multer storage engine that stores files in Digital Ocean Spaces
export const uploadToDigitalOcean = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.DO_SPACES_NAME || '',
    acl: 'public-read',
    key: (req, file, cb) => {
      // Generate a unique filename using UUID
      const filename = `${uuidv4()}-${file.originalname.replace(/\s+/g, '-')}`;
      // Store in a folder based on content type
      const folder = file.mimetype.startsWith('image/') ? 'images' : 'files';
      const key = `${folder}/${filename}`;
      logger.debug(`Generated key for upload: ${key}`);
      cb(null, key);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
});

// Simple function to validate that S3 is properly configured
export const isS3Configured = () => !missingVars.length;

// Function to test S3 connection
export const testS3Connection = async () => {
  try {
    if (!isS3Configured()) {
      return { success: false, message: `Missing configuration: ${missingVars.join(', ')}` };
    }
    
    // List buckets is a simple operation to test connectivity
    const { ListBucketsCommand } = await import('@aws-sdk/client-s3');
    await s3Client.send(new ListBucketsCommand({}));
    
    return { success: true, message: 'Successfully connected to Digital Ocean Spaces' };
  } catch (error) {
    logger.error('Failed to connect to Digital Ocean Spaces:', error);
    return { 
      success: false, 
      message: `Connection failed: ${error.message}`,
      error
    };
  }
};
