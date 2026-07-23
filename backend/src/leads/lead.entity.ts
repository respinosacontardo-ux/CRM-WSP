import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';

/**
 * A lead / prospect interested in the company's software.
 * (In the physiotherapy example this was a "patient".)
 */
@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  /** WhatsApp phone in E.164 format. Unique: one lead per phone number. */
  @Index({ unique: true })
  @Column()
  phone: string;

  @Column({ type: 'text', nullable: true })
  email: string | null;

  /** The lead's business / company name. */
  @Column({ type: 'text', nullable: true })
  company: string | null;

  /** Which product the lead is interested in (Instagram, WhatsApp Pro, ...). */
  @Column({ type: 'text', nullable: true })
  interest: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => Appointment, (appointment) => appointment.lead)
  appointments: Appointment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
