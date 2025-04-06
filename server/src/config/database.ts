import { User } from "../entities/user.entity";
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "video_summarizer",
  logging: ["query", "error"],
  entities: [User],
  migrations: [],
  subscribers: [],
  synchronize: true,
});
