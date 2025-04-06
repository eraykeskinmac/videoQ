import { NextFunction, Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { successResponse } from "../utils/response";
import { StatusCodes } from "http-status-codes/build/cjs";

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
}
