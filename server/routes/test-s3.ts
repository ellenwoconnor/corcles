
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
