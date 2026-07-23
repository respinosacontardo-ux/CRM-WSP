import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * A type of meeting the agent can book (e.g. "Demo Instagram", 30 min).
 * The physiotherapy example called these "services"; here they are the
 * demos / sales meetings offered to leads.
 */
@Entity('meeting_types')
export class MeetingType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'int', default: 30 })
  durationMinutes: number;

  @Column({ default: true })
  active: boolean;

  /** Display order in lists. */
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
