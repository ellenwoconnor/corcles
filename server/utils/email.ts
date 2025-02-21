import { MailService } from '@sendgrid/mail';
import logger from '../logger';

if (!process.env.SENDGRID_API_KEY) {
  logger.warn('SENDGRID_API_KEY not set - emails will not be sent');
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendCommunityInvitation(
  inviteeEmail: string,
  communityName: string,
  inviterName: string
): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    logger.warn('Skipping email send - SENDGRID_API_KEY not set');
    return false;
  }

  try {
    const msg = {
      to: inviteeEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@corcles.com',
      subject: `${inviterName} invited you to join ${communityName} on Corcles`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You're invited to join ${communityName}!</h2>
          <p>Hi there,</p>
          <p>${inviterName} has invited you to join their community on Corcles - a hyperlocal marketplace where neighbors can share, sell, and gift items within their community.</p>
          <p>In ${communityName}, you can:</p>
          <ul>
            <li>Browse items shared by your neighbors</li>
            <li>List items you'd like to share or sell</li>
            <li>Connect with your local community</li>
          </ul>
          <p>To join, simply create an account on Corcles using this email address - you'll automatically be added to the community!</p>
          <p style="margin: 30px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:5000'}/auth" 
               style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Join Corcles
            </a>
          </p>
          <p>Welcome to the neighborhood!</p>
          <p>The Corcles Team</p>
        </div>
      `
    };

    await mailService.send(msg);
    logger.info('Successfully sent community invitation email', {
      to: inviteeEmail,
      community: communityName
    });
    return true;
  } catch (error) {
    logger.error('Failed to send community invitation email:', {
      error,
      to: inviteeEmail,
      community: communityName
    });
    return false;
  }
}
