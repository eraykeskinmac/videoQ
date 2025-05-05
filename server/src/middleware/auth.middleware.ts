import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes/build/cjs";
import { AppError } from "../utils/error";
import { AuthService } from "../services/auth.service";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized");
    }

    const token = authHeader.split(" ")[1];
    const decoded = AuthService.verifyToken(token);

    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};
