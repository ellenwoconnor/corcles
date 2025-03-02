
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import multerS3 from 'multer-s3';
import multer from 'multer';
import logger from '../logger';

// S3 client configuration
const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT, // e.g., "https://nyc3.digitaloceanspaces.com"
  region: 'us-east-1', // Digital Ocean Spaces uses this region regardless of actual location
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || ''
  }
});

const bucketName = process.env.DO_SPACES_NAME || 'your-bucket-name';

// Configure multer storage for S3
export const uploadMiddleware = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: bucketName,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const timestamp = Date.now();
      const fileName = `uploads/${timestamp}-${file.originalname.replace(/\s+/g, '-')}`;
      cb(null, fileName);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Function to upload a buffer to S3
export async function uploadBufferToS3(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
  try {
    const timestamp = Date.now();
    const key = `uploads/${timestamp}-${filename.replace(/\s+/g, '-')}`;
    
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        ACL: 'public-read'
      }
    });

    const result = await upload.done();
    logger.info('Successfully uploaded file to S3', { key });
    
    // Construct and return the URL
    const spacesDomain = process.env.DO_SPACES_ENDPOINT?.replace('https://', '') || '';
    return `https://${bucketName}.${spacesDomain}/${key}`;
  } catch (error) {
    logger.error('Error uploading to S3:', error);
    throw error;
  }
}

export default s3Client;
