import { testS3Connection } from './storage-do';
import logger from './logger';

async function runTest() {
  try {
    logger.info('Testing connection to Digital Ocean Spaces...');

    // Check environment variables
    const requiredEnvVars = [
      'DO_SPACES_KEY',
      'DO_SPACES_SECRET', 
      'DO_SPACES_BUCKET',
      'DO_SPACES_ENDPOINT'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      logger.warn(`Missing environment variables: ${missingVars.join(', ')}`);
      logger.warn('Make sure these are set in your .env file or Replit Secrets');
    } else {
      logger.info('All required environment variables are set');
      logger.info(`Endpoint: ${process.env.DO_SPACES_ENDPOINT}`);
      logger.info(`Bucket: ${process.env.DO_SPACES_BUCKET}`);
    }

    // Test the connection
    const result = await testS3Connection();

    if (result.success) {
      logger.info('✅ Connection to Digital Ocean Spaces successful!');
      logger.info(result.message);
    } else {
      logger.error('❌ Connection to Digital Ocean Spaces failed:');
      logger.error(result.message);
      if (result.error) {
        logger.error('Error details:', result.error);
      }
    }
  } catch (error) {
    logger.error('Unexpected error during connection test:', error);
  } finally {
    // Force exit as AWS SDK can keep process running
    process.exit(0);
  }
}

runTest();