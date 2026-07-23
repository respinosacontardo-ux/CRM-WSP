import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Lead } from '../leads/lead.entity';
import { Message } from './message.entity';

export type ConversationChannel = 'whatsapp' | 'playground';

/** A chat thread with a lead, either over WhatsApp or the in-app Playground. */
@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lead, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'leadId' })
  lead: Lead | null;

  @Column({ type: 'uuid', nullable: true })
  leadId: string | null;

  @Index()
  @Column({ type: 'varchar', default: 'whatsapp' })
  channel: ConversationChannel;

  /** Human label for the thread (lead name or phone). */
  @Column()
  title: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
