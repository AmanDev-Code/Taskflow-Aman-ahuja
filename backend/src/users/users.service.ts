import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async searchUsers(
    query: string,
    options?: { limit?: number; excludeUserId?: string },
  ): Promise<User[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    const limit = Math.min(Math.max(options?.limit ?? 8, 1), 20);
    const likeValue = `%${normalized}%`;

    if (options?.excludeUserId) {
      return this.db.queryMany<User>(
        `SELECT id, name, email, avatar_url, color, created_at, updated_at
         FROM users
         WHERE id <> $1
           AND (LOWER(name) LIKE $2 OR LOWER(email) LIKE $2)
         ORDER BY
           CASE
             WHEN LOWER(email) = $3 THEN 0
             WHEN LOWER(name) = $3 THEN 1
             WHEN LOWER(email) LIKE $4 THEN 2
             WHEN LOWER(name) LIKE $4 THEN 3
             ELSE 4
           END,
           name ASC
         LIMIT $5`,
        [options.excludeUserId, likeValue, normalized, `${normalized}%`, limit],
      );
    }

    return this.db.queryMany<User>(
      `SELECT id, name, email, avatar_url, color, created_at, updated_at
       FROM users
       WHERE LOWER(name) LIKE $1 OR LOWER(email) LIKE $1
       ORDER BY
         CASE
           WHEN LOWER(email) = $2 THEN 0
           WHEN LOWER(name) = $2 THEN 1
           WHEN LOWER(email) LIKE $3 THEN 2
           WHEN LOWER(name) LIKE $3 THEN 3
           ELSE 4
         END,
         name ASC
       LIMIT $4`,
      [likeValue, normalized, `${normalized}%`, limit],
    );
  }

  async create(
    name: string,
    email: string,
    passwordHash: string,
  ): Promise<User> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.db.queryOne<User>(
      `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, avatar_url, color, created_at, updated_at`,
      [id, name, email, passwordHash, now, now],
    );

    return result!;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.queryOne<User>(
      `SELECT id, name, email, password_hash, avatar_url, color, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email],
    );
  }

  async findById(id: string): Promise<User | null> {
    return this.db.queryOne<User>(
      `SELECT id, name, email, avatar_url, color, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id],
    );
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.db.queryOne<User>(
      `SELECT id, name, email, password_hash, avatar_url, color, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id],
    );
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await this.db.queryOne<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists`,
      [email],
    );
    return result?.exists ?? false;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updateUserDto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(updateUserDto.name);
    }

    if (updateUserDto.color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(updateUserDto.color);
    }

    if (updates.length === 0) {
      const user = await this.findById(id);
      if (!user) {
        throw new BadRequestException('User not found');
      }
      return user;
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(id);

    const result = await this.db.queryOne<User>(
      `UPDATE users 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, email, avatar_url, color, created_at, updated_at`,
      values,
    );

    if (!result) {
      throw new BadRequestException('User not found');
    }

    return result;
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    const user = await this.findByIdWithPassword(id);
    if (!user || !user.password_hash) {
      throw new BadRequestException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await this.db.queryOne(
      `UPDATE users 
       SET password_hash = $1, updated_at = $2
       WHERE id = $3`,
      [newPasswordHash, new Date(), id],
    );
  }
}
