import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Lead } from '../leads/lead.entity';

export type AppointmentStatus = 'scheduled' | 'cancelled' | 'completed';
export type AppointmentSource = 'manual' | 'agent';

/**
 * A demo / sales meeting. Always belongs to a lead. Created by hand from the
 * calendar or by the WhatsApp agent.
 */
@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lead, (lead) => lead.appointments, {
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn({ name: 'leadId' })
  lead: Lead;

  @Column()
  leadId: string;

  /** Name of the meeting type (denormalized so history survives config edits). */
  @Column()
  meetingTypeName: string;

  @Index()
  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'varchar', default: 'scheduled' })
  status: AppointmentStatus;

  @Column({ type: 'varchar', default: 'manual' })
  source: AppointmentSource;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
