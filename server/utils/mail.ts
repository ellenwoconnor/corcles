import { MailService } from '@sendgrid/mail';
import logger from '../logger';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailParams): Promise<boolean> {
  try {
    logger.info('Attempting to send email:', { to, subject });

    await mailService.send({
      to,
      from: 'noreply@corcles.com', // Replace with your verified sender
      subject,
      html,
    });

    logger.info('Email sent successfully', { to, subject });
    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
}

export function generateCommunityInviteEmail(communityName: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Welcome to Corcles!</h1>

      <p>You've been invited to join the "${communityName}" community on Corcles.</p>

      <h2>What is Corcles?</h2>
      <p>Corcles is a hyperlocal community marketplace that helps neighbors connect and share resources. Whether you're looking to give away items you no longer need, find something specific, or just meet people in your area, Corcles makes it easy and safe.</p>

      <h2>What you can do on Corcles:</h2>
      <ul>
        <li>Browse and request items from your neighbors</li>
        <li>List items you want to share or sell</li>
        <li>Create wishlists for items you're looking for</li>
        <li>Connect with your local community</li>
      </ul>

      <p>Ready to get started? Click the link in your invitation to join your community!</p>

      <p style="color: #666; font-size: 0.9em;">
        If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;
}