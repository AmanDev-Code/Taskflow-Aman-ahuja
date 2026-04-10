import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  OnModuleInit,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Attachment, AttachmentWithUploader } from './entities/attachment.entity';
import { Client } from 'minio';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class AttachmentsService implements OnModuleInit {
  private readonly logger = new Logger(AttachmentsService.name);
  private readonly minioClient: Client;
  private readonly bucketName: string;
  private readonly urlSigningSecret: string;
  private readonly publicBaseUrl?: string;

  constructor(private readonly db: DatabaseService) {
    this.bucketName = process.env.MINIO_BUCKET || 'taskflow-attachments';
    this.urlSigningSecret = process.env.ATTACHMENTS_URL_SIGNING_SECRET || '';
    this.publicBaseUrl = process.env.ATTACHMENTS_PUBLIC_BASE_URL;
    
    this.minioClient = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    });
  }

  private ensureUrlSigningConfigured(): void {
    if (!this.urlSigningSecret) {
      throw new InternalServerErrorException(
        'Attachment URL signing is not configured. Set ATTACHMENTS_URL_SIGNING_SECRET.',
      );
    }
  }

  private resolvePublicBaseUrl(requestBaseUrl: string): string {
    return (this.publicBaseUrl || requestBaseUrl).replace(/\/+$/, '');
  }

  private createSignedAccessToken(
    attachmentId: string,
    mode: 'preview' | 'download',
    expiresInSeconds = 3600,
  ): string {
    this.ensureUrlSigningConfigured();
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload = `${attachmentId}:${mode}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', this.urlSigningSecret)
      .update(payload)
      .digest('hex');

    return `${expiresAt}.${signature}`;
  }

  validateAccessToken(
    attachmentId: string,
    mode: 'preview' | 'download',
    token?: string,
  ): void {
    this.ensureUrlSigningConfigured();
    if (!token) {
      throw new UnauthorizedException('Missing attachment access token');
    }

    const [expiresAtRaw, signature] = token.split('.');
    const expiresAt = Number(expiresAtRaw);
    if (!expiresAt || !signature) {
      throw new UnauthorizedException('Invalid attachment access token');
    }

    if (Math.floor(Date.now() / 1000) > expiresAt) {
      throw new UnauthorizedException('Attachment access token expired');
    }

    const payload = `${attachmentId}:${mode}:${expiresAt}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.urlSigningSecret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new UnauthorizedException('Invalid attachment access token');
    }
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName);
        this.logger.log(`Created MinIO bucket: ${this.bucketName}`);
      } else {
        this.logger.log(`MinIO bucket exists: ${this.bucketName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure bucket exists: ${error.message}`, error.stack);
      throw error;
    }
  }

  async uploadFile(
    taskId: string,
    userId: string,
    file: { filename: string; mimetype: string; data: Buffer },
  ): Promise<Attachment> {
    const uniqueFilename = `${uuidv4()}${path.extname(file.filename)}`;
    const objectName = `tasks/${taskId}/${uniqueFilename}`;

    try {
      await this.minioClient.putObject(
        this.bucketName,
        objectName,
        file.data,
        file.data.length,
        { 'Content-Type': file.mimetype },
      );
      this.logger.log(`File uploaded to MinIO: ${objectName}`);
    } catch (error) {
      this.logger.error(`Failed to upload file to MinIO: ${error.message}`, error.stack);
      throw error;
    }

    const result = await this.db.query<Attachment>(
      `INSERT INTO attachments (task_id, subtask_id, filename, original_filename, mime_type, size, uploaded_by)
       VALUES ($1, NULL, $2, $3, $4, $5, $6)
       RETURNING *`,
      [taskId, objectName, file.filename, file.mimetype, file.data.length, userId],
    );

    return result.rows[0];
  }

  async getAttachmentsByTaskId(taskId: string): Promise<AttachmentWithUploader[]> {
    const result = await this.db.query<AttachmentWithUploader>(
      `SELECT a.*, u.name as uploader_name, u.email as uploader_email
       FROM attachments a
       JOIN users u ON a.uploaded_by = u.id
       WHERE a.task_id = $1
       ORDER BY a.created_at DESC`,
      [taskId],
    );

    return result.rows;
  }

  async uploadFileForSubtask(
    subtaskId: string,
    userId: string,
    file: { filename: string; mimetype: string; data: Buffer },
  ): Promise<Attachment> {
    const uniqueFilename = `${uuidv4()}${path.extname(file.filename)}`;
    const objectName = `subtasks/${subtaskId}/${uniqueFilename}`;

    try {
      await this.minioClient.putObject(
        this.bucketName,
        objectName,
        file.data,
        file.data.length,
        { 'Content-Type': file.mimetype },
      );
      this.logger.log(`File uploaded to MinIO: ${objectName}`);
    } catch (error) {
      this.logger.error(`Failed to upload file to MinIO: ${error.message}`, error.stack);
      throw error;
    }

    const result = await this.db.query<Attachment>(
      `INSERT INTO attachments (task_id, subtask_id, filename, original_filename, mime_type, size, uploaded_by)
       VALUES (NULL, $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [subtaskId, objectName, file.filename, file.mimetype, file.data.length, userId],
    );

    return result.rows[0];
  }

  async getAttachmentsBySubtaskId(subtaskId: string): Promise<AttachmentWithUploader[]> {
    const result = await this.db.query<AttachmentWithUploader>(
      `SELECT a.*, u.name as uploader_name, u.email as uploader_email
       FROM attachments a
       JOIN users u ON a.uploaded_by = u.id
       WHERE a.subtask_id = $1
       ORDER BY a.created_at DESC`,
      [subtaskId],
    );

    return result.rows;
  }

  async getAttachmentById(id: string): Promise<Attachment | null> {
    const result = await this.db.query<Attachment>(
      `SELECT * FROM attachments WHERE id = $1`,
      [id],
    );

    return result.rows[0] || null;
  }

  async deleteAttachment(id: string, userId: string): Promise<void> {
    const attachment = await this.getAttachmentById(id);

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.uploaded_by !== userId) {
      const isProjectOwner = await this.isUserProjectOwner(attachment, userId);
      if (!isProjectOwner) {
        throw new ForbiddenException('You can only delete your own attachments');
      }
    }

    try {
      await this.minioClient.removeObject(this.bucketName, attachment.filename);
      this.logger.log(`File deleted from MinIO: ${attachment.filename}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from MinIO: ${error.message}`, error.stack);
    }

    await this.db.query(`DELETE FROM attachments WHERE id = $1`, [id]);
  }

  async getAttachmentAccessUrls(
    id: string,
    userId: string,
    requestBaseUrl: string,
  ): Promise<{
    url: string;
    previewUrl: string;
    downloadUrl: string;
    filename: string;
    mimeType: string;
    expiresIn: number;
  }> {
    const attachment = await this.getAttachmentById(id);

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const canAccess = await this.hasAttachmentAccess(id, userId);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this attachment');
    }

    const expiresIn = 3600;
    const baseUrl = this.resolvePublicBaseUrl(requestBaseUrl);
    const previewToken = this.createSignedAccessToken(id, 'preview', expiresIn);
    const downloadToken = this.createSignedAccessToken(id, 'download', expiresIn);
    const previewUrl = `${baseUrl}/attachments/${id}/preview?token=${previewToken}`;
    const downloadUrl = `${baseUrl}/attachments/${id}/download?token=${downloadToken}`;

    return {
      url: attachment.mime_type.startsWith('image/') ? previewUrl : downloadUrl,
      previewUrl,
      downloadUrl,
      filename: attachment.original_filename,
      mimeType: attachment.mime_type,
      expiresIn,
    };
  }

  private async hasAttachmentAccess(attachmentId: string, userId: string): Promise<boolean> {
    const result = await this.db.queryOne<{ has_access: boolean }>(
      `SELECT EXISTS(
         SELECT 1
         FROM attachments a
         LEFT JOIN subtasks s ON s.id = a.subtask_id
         JOIN tasks t ON t.id = COALESCE(a.task_id, s.task_id)
         JOIN projects p ON p.id = t.project_id
         LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
         WHERE a.id = $1
           AND (
             p.owner_id = $2
             OR pm.user_id IS NOT NULL
             OR t.creator_id = $2
             OR t.assignee_id = $2
           )
       ) AS has_access`,
      [attachmentId, userId],
    );

    return result?.has_access ?? false;
  }

  async getFileStream(id: string): Promise<{ stream: NodeJS.ReadableStream; filename: string; mimeType: string }> {
    const attachment = await this.getAttachmentById(id);

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    try {
      const stream = await this.minioClient.getObject(this.bucketName, attachment.filename);

      return {
        stream,
        filename: attachment.original_filename,
        mimeType: attachment.mime_type,
      };
    } catch (error) {
      this.logger.error(`Failed to get file from MinIO: ${error.message}`, error.stack);
      throw new NotFoundException('File not found in storage');
    }
  }

  private async isUserProjectOwner(attachment: Attachment, userId: string): Promise<boolean> {
    const taskId =
      attachment.task_id ??
      (
        await this.db.queryOne<{ task_id: string }>(
          `SELECT task_id FROM subtasks WHERE id = $1`,
          [attachment.subtask_id],
        )
      )?.task_id;

    if (!taskId) {
      return false;
    }

    const result = await this.db.query<{ owner_id: string }>(
      `SELECT p.owner_id 
       FROM projects p
       JOIN tasks t ON t.project_id = p.id
       WHERE t.id = $1`,
      [taskId],
    );

    return result.rows[0]?.owner_id === userId;
  }
}
