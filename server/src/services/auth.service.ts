import { AppError } from "../utils/error";
import { AppDataSource } from "../config/database";
import { User } from "../entities/user.entity";
import { StatusCodes } from "http-status-codes";
import crypto from "crypto";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { STATUS_CODES } from "http";
import { EmailService } from "./email.service";

export class AuthService {
  private static readonly userRepository = AppDataSource.getRepository(User);
  private static readonly JWT_SECRET: Secret =
    process.env.JWT_SECRET || "secret";
  private static readonly JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
    "24h") as SignOptions["expiresIn"];

  static async register(email: string, password: string, name?: string) {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid credentials");
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24); // 24 hours

    const user = new User();
    user.email = email;
    user.password = password;
    user.name = name || "";
    user.emailVerificationToken = verificationToken;
    user.emailVerificationTokenExpiresAt = tokenExpires;

    await this.userRepository.save(user);

    // TODO: Send verification email

    await EmailService.sendVerificationEmail(email, verificationToken);

    const token = this.generateToken(user);
    return { user, token };
  }

  static async login(email: string, password: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid credentials");
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid credentials");
    }

    user.lastLogin = new Date();
    await this.userRepository.save(user);

    const token = this.generateToken(user);
    return { user, token };
  }

  static async verifyEmail(token: string) {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid verification token");
    }

    if (
      !user.emailVerificationTokenExpiresAt ||
      user.emailVerificationTokenExpiresAt < new Date()
    ) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Verification token expired");
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpiresAt = null;

    await this.userRepository.save(user);

    //  TODO: Send Welcome mail

    return { message: "Email verified successfully" };
  }

  static generateToken(user: User): string {
    return jwt.sign({ userId: user.id, email: user.email }, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }
}
