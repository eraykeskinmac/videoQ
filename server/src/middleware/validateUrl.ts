import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/error";
import { StatusCodes } from "http-status-codes";

export const validateYoutube = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const [url] = req.body;

  if (!url) {
    return next(new AppError(StatusCodes.BAD_REQUEST, "URL is required"));
  }
};
