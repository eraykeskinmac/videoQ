import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Video } from "./video.entity";

@Entity()
export class Analysis {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text" })
  summary: string;

  @Column("text", { array: true })
  keyPoints: string[];

  @Column({
    type: "enum",
    enum: ["positive", "negative", "neutral"],
    default: "neutral",
  })
  sentiment: "positive" | "negative" | "neutral";

  @Column({ type: "text", array: true })
  topics: string[];

  @Column({ type: "text", array: true })
  suggestedTags: string[];

  @OneToOne(() => Video, (video) => video.analysis)
  @JoinColumn()
  video: Video;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
