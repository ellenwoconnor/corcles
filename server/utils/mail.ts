import { Resend } from "resend";
import logger from "../logger";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable must be set");
}

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({
  to,
  subject,
  html,
}: SendMailParams): Promise<boolean> {
  try {
    logger.info("Attempting to send email:", { to, subject });

    await resend.emails.send({
      from: "Corcles <admin@corcles.com>",
      to,
      subject,
      html,
    });

    logger.info("Email sent successfully", { to, subject });
    return true;
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error("Failed to send email:", {
        error: error.message,
        to,
        subject,
      });
    } else {
      logger.error("Failed to send email with unknown error:", error);
    }
    return false;
  }
}

interface InviteEmailParams {
  communityName: string;
  inviterName: string;
  message?: string;
}

export function generateCommunityInviteEmail({
  communityName,
  inviterName,
  message,
}: InviteEmailParams): string {
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; background-color: #ffffff; border-radius: 8px; color: hsl(222.2 47.4% 11.2%);">
      <div style="text-align: center; margin-bottom: 2rem;">
        <h1 style="color: hsl(222.2 47.4% 11.2%); font-size: 1.75rem; margin-bottom: 1.5rem;">Welcome to Corcles!</h1>
        
        <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 2rem;">
          <strong>${inviterName}</strong> has invited you to join the <strong>"${communityName}"</strong> community on Corcles.
        </p>
        ${message ? `
        <div style="background-color: #f8f9fc; padding: 1.5rem; border-radius: 6px; margin: 1rem 0;">
          <p style="font-style: italic; color: #666;">"${message}"</p>
        </div>
        ` : ''}
      </div>

      <div style="background-color: #f8f9fc; padding: 1.5rem; border-radius: 6px; margin-bottom: 2rem;">
        <h2 style="color: hsl(222.2 47.4% 11.2%); font-size: 1.25rem; margin-bottom: 1rem;">What is Corcles?</h2>
        <p style="line-height: 1.6; margin-bottom: 1rem;">
          Corcles is a hyperlocal community marketplace that helps neighbors connect and share resources. Whether you're looking to give away items you no longer need, find something specific, or just meet people in your area, Corcles makes it easy and safe.
        </p>
      </div>

      <div style="margin-bottom: 2rem;">
        <h2 style="color: hsl(222.2 47.4% 11.2%); font-size: 1.25rem; margin-bottom: 1rem;">What you can do on Corcles:</h2>
        <ul style="padding-left: 1.5rem; line-height: 1.8;">
          <li>Browse and request items from your neighbors</li>
          <li>List items you want to share or sell</li>
          <li>Create wishlists for items you're looking for</li>
          <li>Connect with your local community</li>
        </ul>
      </div>

      <div style="margin: 2.5rem 0; text-align: center;">
        <a href="https://corcles.com/auth" 
           style="background-color: hsl(222.2 47.4% 11.2%); color: white; padding: 14px 28px; 
                  text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 1.1rem; display: inline-block;">
          Join Your Community
        </a>
      </div>

      <div style="text-align: center; margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid #eaeaea;">
        <p style="color: #666; font-size: 0.9rem;">
          If you did not expect this invitation, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;
}
