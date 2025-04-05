import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import express, { Express, NextFunction, Request, Response } from "express";
import logger, { stream } from "./utils/logger";
import { AppDataSource } from "./config/database";
import morgan from "morgan";
import cors from "cors";
import routes from "./routes";
import { errorResponse } from "./utils/response";
import { handleError } from "./utils/error";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 6000;

const initialize = async () => {
  try {
    await AppDataSource.initialize();
    logger.info("Database connected");

    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error("Failed to initialize server", error);
    process.exit(1);
  }
};

app.use(cors());
app.use(express.json());
app.use(
  morgan(process.env.NODE_ENV === "development" ? "dev" : "combined", {
    stream,
  })
);

const API_VERSION = "/api/v1";

app.use(API_VERSION, routes);

app.use((req: Request, res: Response) => {
  res
    .status(404)
    .json(errorResponse(`Cannot find  ${req.originalUrl} on this server!`));
});

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(error.stack || error.message);
  const errorDetails = handleError(error);

  res
    .status(errorDetails.statusCode)
    .json(errorResponse(errorDetails.message, error));
});

initialize().catch((error) => {
  logger.error("Failed to initialize server", error);
  process.exit(1);
});
