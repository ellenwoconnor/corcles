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

    const msg = {
      to,
      from: process.env.SENDGRID_VERIFIED_SENDER || process.env.SENDGRID_FROM_EMAIL || 'your.verified.email@gmail.com', // Use environment variable for sender
      subject,
      html,
    };

    logger.debug('Sending email with params:', {
      to: msg.to,
      from: msg.from,
      subject: msg.subject
    });

    await mailService.send(msg);
    logger.info('Email sent successfully', { to, subject });
    return true;
  } catch (error: unknown) {
    // Log SendGrid specific error information
    if (error && typeof error === 'object' && 'response' in error) {
      const sendGridError = error as { 
        code?: number; 
        response?: { 
          body?: { 
            errors?: Array<{ message?: string; field?: string; help?: string }> 
          } 
        };
        message?: string;
      };

      logger.error('SendGrid API error:', {
        statusCode: sendGridError.code,
        errors: sendGridError.response?.body?.errors,
        message: sendGridError.message
      });
    } else {
      logger.error('Failed to send email:', error);
    }
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