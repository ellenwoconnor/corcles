import { Resend } from 'resend';
import logger from '../logger';

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable must be set");
}

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailParams): Promise<boolean> {
  try {
    logger.info('Attempting to send email:', { to, subject });

    await resend.emails.send({
      from: 'Corcles <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    logger.info('Email sent successfully', { to, subject });
    return true;
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Failed to send email:', {
        error: error.message,
        to,
        subject
      });
    } else {
      logger.error('Failed to send email with unknown error:', error);
    }
    return false;
  }
}

interface InviteEmailParams {
  communityName: string;
  inviterName: string;
}

export function generateCommunityInviteEmail({ communityName, inviterName }: InviteEmailParams): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Welcome to Corcles!</h1>

      <p>${inviterName} has invited you to join the "${communityName}" community on Corcles.</p>

      <h2>What is Corcles?</h2>
      <p>Corcles is a hyperlocal community marketplace that helps neighbors connect and share resources. Whether you're looking to give away items you no longer need, find something specific, or just meet people in your area, Corcles makes it easy and safe.</p>

      <h2>What you can do on Corcles:</h2>
      <ul>
        <li>Browse and request items from your neighbors</li>
        <li>List items you want to share or sell</li>
        <li>Create wishlists for items you're looking for</li>
        <li>Connect with your local community</li>
      </ul>

      <div style="margin: 30px 0; text-align: center;">
        <a href="https://corcles.com/auth" 
           style="background-color: #0070f3; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; font-weight: bold;">
          Join Your Community
        </a>
      </div>

      <p style="color: #666; font-size: 0.9em;">
        If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;
}