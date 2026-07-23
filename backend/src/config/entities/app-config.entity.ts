import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Singleton configuration for the single tenant. There is exactly one row.
 *
 * Persona + AI model are configured from the UI (Agent screen).
 * The WhatsApp/YCloud connection is NOT stored here — it comes from env only.
 */
@Entity('app_config')
export class AppConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Company persona ---
  @Column({ default: 'MKT BATTISTON' })
  companyName: string;

  @Column({ type: 'text', default: '' })
  companyDescription: string;

  @Column({ default: 'cercano y profesional' })
  tone: string;

  @Column({ default: 'America/Argentina/Buenos_Aires' })
  timezone: string;

  /** Master on/off switch for the WhatsApp agent. */
  @Column({ default: true })
  agentEnabled: boolean;

  // --- AI model (OpenRouter) ---
  /**
   * Secret. Never returned by the API (sanitized to a `has*` boolean).
   * Nullable so the env fallback can be used instead.
   */
  @Column({ type: 'text', nullable: true })
  openRouterApiKey: string | null;

  @Column({ type: 'text', nullable: true })
  agentModel: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
