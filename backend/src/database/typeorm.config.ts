import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Builds the TypeORM connection options from environment variables.
 *
 * `synchronize: true` keeps the schema in sync with the entities automatically,
 * which is convenient for a single-tenant tool that a non-technical person
 * deploys. For a large multi-tenant system you would use migrations instead.
 */
export function buildTypeOrmOptions(): TypeOrmModuleOptions {
  const url = process.env.DATABASE_URL;

  return {
    type: 'postgres',
    url,
    autoLoadEntities: true,
    synchronize: true,
    // Do not log SQL by default: query parameters can contain lead PII.
    logging: false,
  };
}
