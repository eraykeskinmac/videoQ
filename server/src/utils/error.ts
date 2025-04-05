import logger from "./logger";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const handleError = (error: Error | AppError) => {
  if (error instanceof AppError && error.isOperational) {
    return {
      status: "error",
      statusCode: error.statusCode,
      message: error.message,
    };
  }

  logger.error(error);
  return {
    status: "error",
    statusCode: 500,
    message: "Internal server error",
  };
};
