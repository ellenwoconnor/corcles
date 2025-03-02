import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';

// Check if required environment variables are set
export function isS3Configured() {
  const configured = Boolean(
    process.env.DO_SPACES_KEY && 
    process.env.DO_SPACES_SECRET && 
    process.env.DO_SPACES_ENDPOINT && 
    process.env.DO_SPACES_BUCKET
  );

  if (configured) {
    // Validate the endpoint URL
    try {
      // Make sure endpoint is a valid URL
      new URL(process.env.DO_SPACES_ENDPOINT);
    } catch (error) {
      logger.error('Invalid S3 endpoint URL:', { 
        endpoint: process.env.DO_SPACES_ENDPOINT, 
        error: error.message 
      });
      return false;
    }
  }

  return configured;
}

// Initialize S3 client if configured
let s3Client: S3Client | null = null;

if (isS3Configured()) {
  try {
    const endpoint = process.env.DO_SPACES_ENDPOINT;

    // Log the exact endpoint for debugging
    logger.debug('Initializing S3 client with endpoint:', { endpoint });

    s3Client = new S3Client({
      endpoint: endpoint,
      region: "us-east-1", // Digital Ocean Spaces uses this region
      credentials: {
        accessKeyId: process.env.DO_SPACES_KEY!,
        secretAccessKey: process.env.DO_SPACES_SECRET!,
      },
    });

    logger.info('S3 client initialized successfully with endpoint:', { 
      endpoint: process.env.DO_SPACES_ENDPOINT,
      bucket: process.env.DO_SPACES_BUCKET 
    });
  } catch (error) {
    logger.error('Failed to initialize S3 client:', { 
      error: error.message,
      endpoint: process.env.DO_SPACES_ENDPOINT
    });
    s3Client = null;
  }
}

// Create a multer storage engine that stores files in Digital Ocean Spaces
export const uploadToDigitalOcean = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.DO_SPACES_BUCKET || '',
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


export async function uploadToDigitalOcean(file: Express.Multer.File) {
  if (!isS3Configured() || !s3Client) {
    logger.error('S3 not configured for upload');
    throw new Error('S3 not properly configured');
  }

  try {
    const key = `images/${uuidv4()}-${file.originalname}`;
    logger.debug('Generated key for upload:', key);

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.DO_SPACES_BUCKET!,
        Key: key,
        Body: file.buffer,
        ACL: 'public-read',
        ContentType: file.mimetype,
      },
    });

    await upload.done();

    // Ensure endpoint does not end with a slash before constructing URL
    const baseEndpoint = process.env.DO_SPACES_ENDPOINT!.endsWith('/') 
      ? process.env.DO_SPACES_ENDPOINT!.slice(0, -1) 
      : process.env.DO_SPACES_ENDPOINT!;

    // Construct the public URL for the uploaded object
    const fileUrl = `${baseEndpoint}/${process.env.DO_SPACES_BUCKET}/${key}`;

    // Log the constructed URL for debugging
    logger.info('File uploaded successfully:', {
      key,
      url: fileUrl,
      endpoint: process.env.DO_SPACES_ENDPOINT,
      bucket: process.env.DO_SPACES_BUCKET,
      originalName: file.originalname,
      size: file.buffer.length,
      mimeType: file.mimetype,
    });

    return {
      location: fileUrl,
      key,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.buffer.length,
    };
  } catch (error) {
    logger.error('Error uploading file to S3:', {
      error: error.message,
      stack: error.stack,
      endpoint: process.env.DO_SPACES_ENDPOINT,
      bucket: process.env.DO_SPACES_BUCKET,
      originalName: file.originalname
    });
    throw error;
  }
}

// Simple function to validate that S3 is properly configured
export const isS3Configured = () => {
    const configured = Boolean(
        process.env.DO_SPACES_KEY &&
        process.env.DO_SPACES_SECRET &&
        process.env.DO_SPACES_ENDPOINT &&
        process.env.DO_SPACES_BUCKET
    );
    
    if (configured) {
        try {
            new URL(process.env.DO_SPACES_ENDPOINT);
        } catch (error) {
            logger.error('Invalid S3 endpoint URL:', {
                endpoint: process.env.DO_SPACES_ENDPOINT,
                error: error.message
            });
            return false;
        }
    }
    return configured;
};

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