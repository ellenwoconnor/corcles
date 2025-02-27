import { sendMail } from './utils/mail';
import logger from './logger';

async function testEmailSending() {
  logger.info('Starting email test...');
  
  // Log partial API key to verify it's loaded (only show last 4 characters)
  const apiKey = process.env.SENDGRID_API_KEY || '';
  const senderEmail = process.env.SENDGRID_FROM_EMAIL || '';
  logger.info('Environment check:', {
    apiKeyPresent: !!apiKey,
    apiKeyLastChars: apiKey.slice(-4),
    senderEmail: senderEmail,
  });

  const testEmail = {
    to: "test@example.com", // Replace with your test email
    subject: "Test Email from Corcles",
    html: `
      <div>
        <h1>Test Email</h1>
        <p>This is a test email from the Corcles application.</p>
        <p>If you receive this, the SendGrid integration is working correctly.</p>
      </div>
    `
  };

  try {
    const result = await sendMail(testEmail);
    logger.info('Test email result:', { success: result });
  } catch (error) {
    logger.error('Test email failed:', error);
  }
}

// Run the test
testEmailSending().catch(console.error);
