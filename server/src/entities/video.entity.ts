import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity()
export class Video {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  url: string;

  @Column()
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column()
  duration: number;

  @Column()
  author: string;

  @Column({ type: "text", nullable: true })
  thumbnail: string;

  @Column({ default: "pending" })
  status: "pending" | "processing" | "completed" | "failed";

  @ManyToOne(() => User, (user) => user.videos, { nullable: false })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
