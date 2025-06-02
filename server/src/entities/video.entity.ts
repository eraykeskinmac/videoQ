import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Transcription } from "./transcription.entity";
import { Analysis } from "./analysis.entity";

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

  @OneToOne(() => Transcription, (transcription) => transcription.video)
  transcription: Transcription;

  @OneToOne(() => Analysis, (analysis) => analysis.video)
  analysis: Analysis;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
