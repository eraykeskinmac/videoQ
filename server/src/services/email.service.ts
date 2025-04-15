import { Resend } from "resend";
import { verificationEmailTemplate } from "../templates/emails/verifiction.template";
import logger from "../utils/logger";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../utils/error";
import { welcomeEmailTemplate } from "../templates/emails/welcome.template";

export class EmailService {
  private static readonly resend = new Resend(process.env.RESEND_API_KEY || "");
  private static readonly FROM_EMAIL = "onboarding@resend.dev";

  static async sendVerificationEmail(email: string, token: string) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;

      await this.resend.emails.send({
        from: this.FROM_EMAIL,
        to: email,
        subject: "Verify your email",
        html: verificationEmailTemplate(verificationUrl),
      });
    } catch (error) {
      logger.error(`Error sending verification email: ${error}`);
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to send verification email"
      );
    }
  }

  static async sendWelcomeEmail(email: string, name: string) {
    try {
      await this.resend.emails.send({
        from: this.FROM_EMAIL,
        to: email,
        subject: "Welcome to our app",
        html: welcomeEmailTemplate(name || "There"),
      });
    } catch (error) {
      logger.error(`Error sending welcome email: ${error}`);
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to send welcome email"
      );
    }
  }
}
