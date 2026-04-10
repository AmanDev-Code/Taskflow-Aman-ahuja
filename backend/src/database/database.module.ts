import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import * as fs from 'fs';
import * as path from 'path';

@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'development' || process.env.AUTO_MIGRATE === 'true') {
      await this.runMigrations();
    }
  }

  private async runMigrations() {
    this.logger.log('Running auto-migrations for development...');

    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      this.logger.warn(`Migrations directory not found: ${migrationsDir}`);
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && !f.includes('seed'))
      .sort();

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const upMatch = content.match(/-- migrate:up\n([\s\S]*?)(?:-- migrate:down|$)/);
      if (upMatch) {
        const upSql = upMatch[1].trim();
        if (upSql) {
          try {
            await this.db.query(upSql);
            this.logger.log(`Applied migration: ${file}`);
          } catch (error: any) {
            if (error.code === '42P07' || error.code === '42710') {
              this.logger.debug(`Migration already applied: ${file}`);
            } else {
              this.logger.error(`Migration failed: ${file}`, error.message);
            }
          }
        }
      }
    }

    const seedFile = path.join(migrationsDir, 'seed.sql');
    if (fs.existsSync(seedFile)) {
      const seedContent = fs.readFileSync(seedFile, 'utf-8');
      try {
        await this.db.query(seedContent);
        this.logger.log('Seed data applied');
      } catch (error: any) {
        if (error.code === '23505') {
          this.logger.debug('Seed data already exists');
        } else {
          this.logger.warn(`Seed warning: ${error.message}`);
        }
      }
    }

    this.logger.log('Auto-migrations complete');
  }
}
