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
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #fcfcfc; border-radius: 12px; color: #444;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #0070f3; font-size: 36px; margin-bottom: 10px; font-weight: 700;">✨ Welcome to Corcles! ✨</h1>
        <div style="width: 80px; height: 6px; background: linear-gradient(90deg, #0070f3, #00c6ff); margin: 0 auto 30px; border-radius: 10px;"></div>
        <p style="font-size: 18px; line-height: 1.6; margin-bottom: 30px; color: #555;">
          ${inviterName} has invited you to join the <span style="background: linear-gradient(90deg, #0070f3, #00c6ff); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: bold;">"${communityName}"</span> community!
        </p>
      </div>

      <div style="background-color: #f0f7ff; padding: 30px; border-radius: 12px; margin-bottom: 35px;">
        <h2 style="color: #0070f3; font-size: 24px; margin-bottom: 20px;">What is Corcles?</h2>
        <p style="font-size: 16px; line-height: 1.7; margin-bottom: 20px;">
          Corcles is a hyperlocal community marketplace that helps neighbors connect and share resources. Whether you're looking to give away items you no longer need, find something specific, or just meet people in your area, Corcles makes it easy and safe.
        </p>
      </div>

      <div style="margin-bottom: 35px;">
        <h2 style="color: #0070f3; font-size: 24px; margin-bottom: 20px;">What you can do on Corcles:</h2>
        <ul style="padding-left: 20px; font-size: 16px; line-height: 1.7;">
          <li style="margin-bottom: 12px;">🏠 Browse and request items from your neighbors</li>
          <li style="margin-bottom: 12px;">🎁 List items you want to share or sell</li>
          <li style="margin-bottom: 12px;">✨ Create wishlists for items you're looking for</li>
          <li style="margin-bottom: 12px;">👋 Connect with your local community</li>
        </ul>
      </div>

      <div style="margin: 40px 0; text-align: center;">
        <a href="https://corcles.com/auth" 
           style="background: linear-gradient(90deg, #0070f3, #00c6ff); color: white; padding: 16px 30px; 
                  text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 18px;
                  display: inline-block; box-shadow: 0 4px 10px rgba(0, 112, 243, 0.2);
                  transition: all 0.3s ease;">
          Join Your Community
        </a>
      </div>

      <p style="color: #888; font-size: 14px; text-align: center; margin-top: 40px; font-style: italic;">
        If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;
}