import { NextFunction, Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { successResponse } from "../utils/response";
import { StatusCodes } from "http-status-codes/build/cjs";
import { AppError } from "../utils/error";

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body;
      const result = await AuthService.register(email, password, name);
      res.status(StatusCodes.CREATED).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.status(StatusCodes.OK).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        throw new AppError(StatusCodes.BAD_REQUEST, "Invalid token");
      }
      const result = await AuthService.verifyEmail(token);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  static async resendVerificationEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { email } = req.body;
      const result = await AuthService.resendVerificationEmail(email);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.getUserById(req.user?.userId!);
      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  }
}
