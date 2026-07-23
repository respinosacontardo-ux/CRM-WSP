import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One opening interval on a given weekday. A day can have several rows
 * (e.g. Monday 09:00-14:00 and 16:00-20:00).
 *
 * dayOfWeek: 0 = Sunday ... 6 = Saturday (matches JS Date.getDay()).
 * Times are stored as "HH:MM" strings in the company's local timezone.
 */
@Entity('business_hours')
export class BusinessHour {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  dayOfWeek: number;

  @Column({ length: 5 })
  startTime: string;

  @Column({ length: 5 })
  endTime: string;
}
