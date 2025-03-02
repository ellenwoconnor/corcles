
import { Express } from 'express';
import { testS3Connection } from '../storage-do';
import logger from '../logger';

export function setupTestS3Routes(app: Express) {
  // Test endpoint for S3 connection
  app.get('/api/admin/test-s3', async (req, res) => {
    try {
      logger.info('Testing S3 connection');
      const result = await testS3Connection();
      
      if (result.success) {
        logger.info('S3 connection test successful');
        res.json({ success: true, message: result.message });
      } else {
        logger.warn('S3 connection test failed', result);
        res.status(500).json({ 
          success: false, 
          message: result.message,
          error: result.error 
        });
      }
    } catch (error) {
      logger.error('Error in S3 connection test route:', error);
      res.status(500).json({ 
        success: false, 
        message: 'An unexpected error occurred testing S3 connection',
        error: error.message
      });
    }
  });
}
import { Express } from 'express';
import { testS3Connection } from '../storage-do';
import logger from '../logger';
import multer from 'multer';
import { isS3Configured, uploadToDigitalOcean } from '../storage-do';

export function setupTestS3Routes(app: Express) {
  // Test endpoint for S3 connection
  app.get('/api/admin/test-s3', async (req, res) => {
    try {
      logger.info('Testing S3 connection');
      const result = await testS3Connection();
      
      if (result.success) {
        logger.info('S3 connection test successful');
        res.json({ success: true, message: result.message });
      } else {
        logger.warn('S3 connection test failed', result);
        res.status(500).json({ 
          success: false, 
          message: result.message,
          error: result.error 
        });
      }
    } catch (error) {
      logger.error('Error in S3 connection test route:', error);
      res.status(500).json({ 
        success: false, 
        message: 'An unexpected error occurred testing S3 connection',
        error: error.message
      });
    }
  });

  // Upload test endpoint
  app.post('/api/admin/test-s3-upload', uploadToDigitalOcean.single('testFile'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      if (req.file.location) {
        logger.info('Test file successfully uploaded to DO Spaces', {
          url: req.file.location,
          size: req.file.size,
          mimetype: req.file.mimetype
        });

        return res.json({
          success: true,
          message: 'File uploaded successfully to Digital Ocean Spaces',
          fileUrl: req.file.location,
          fileDetails: {
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
          }
        });
      } else {
        logger.warn('File upload completed but no location returned', { file: req.file });
        return res.status(500).json({
          success: false,
          message: 'File upload completed but no S3 location returned',
          file: req.file
        });
      }
    } catch (error) {
      logger.error('Error in test file upload to S3:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading test file to S3',
        error: error.message
      });
    }
  });

  // S3 Environment Check
  app.get('/api/admin/check-s3-config', (req, res) => {
    const isConfigured = isS3Configured();
    
    // Check environment variables without exposing sensitive values
    const envStatus = {
      DO_SPACES_KEY: !!process.env.DO_SPACES_KEY,
      DO_SPACES_SECRET: !!process.env.DO_SPACES_SECRET,
      DO_SPACES_NAME: !!process.env.DO_SPACES_NAME,
      DO_SPACES_ENDPOINT: process.env.DO_SPACES_ENDPOINT || '(using default)'
    };
    
    res.json({
      success: true,
      isConfigured,
      environment: envStatus,
      activeStorage: isConfigured ? 'Digital Ocean Spaces' : 'Memory Storage Fallback'
    });
  });
}
