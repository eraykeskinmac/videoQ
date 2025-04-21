import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/error";
import { StatusCodes } from "http-status-codes";
import validator from "validator";

export const validateYoutubeUrl = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { url } = req.body;

  if (!url) {
    return next(new AppError(StatusCodes.BAD_REQUEST, "URL is required"));
  }

  if (!validator.isURL(url)) {
    return next(new AppError(StatusCodes.BAD_REQUEST, "Invalid URL"));
  }

  // check if url is youtube url
  const youtubeUrlRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})$/;

  if (!youtubeUrlRegex.test(url)) {
    return next(
      new AppError(StatusCodes.BAD_REQUEST, "URL is not a valid YouTube URL")
    );
  }

  next();
};
