import {
  Controller,
  Get,
  Delete,
  Param,
  Res,
  Req,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AttachmentsService } from './attachments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

interface AuthenticatedUser {
  userId: string;
  email: string;
}

@Controller()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  /** List/upload: TasksController (Fastify route order). */

  @Delete('attachments/:id')
  async deleteAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.attachmentsService.deleteAttachment(id, user.userId);
    return { message: 'Attachment deleted successfully' };
  }

  @Get('attachments/:id/download')
  @Public()
  async downloadAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string,
    @Res() reply: FastifyReply,
  ) {
    this.attachmentsService.validateAccessToken(id, 'download', token);
    const fileInfo = await this.attachmentsService.getFileStream(id);

    reply.header('Content-Type', fileInfo.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileInfo.filename)}"`,
    );

    return reply.send(fileInfo.stream);
  }

  @Get('attachments/:id/preview')
  @Public()
  async previewAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string,
    @Res() reply: FastifyReply,
  ) {
    this.attachmentsService.validateAccessToken(id, 'preview', token);
    const fileInfo = await this.attachmentsService.getFileStream(id);

    reply.header('Content-Type', fileInfo.mimeType);
    reply.header(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileInfo.filename)}"`,
    );

    return reply.send(fileInfo.stream);
  }

  @Get('attachments/:id/url')
  async getPresignedUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: FastifyRequest,
  ) {
    const forwardedProto = request.headers['x-forwarded-proto'];
    const protocol =
      typeof forwardedProto === 'string'
        ? forwardedProto.split(',')[0].trim()
        : request.protocol;
    const host = request.headers.host || `localhost:${process.env.PORT || '3001'}`;
    const requestBaseUrl = `${protocol}://${host}`;
    const urlInfo = await this.attachmentsService.getAttachmentAccessUrls(
      id,
      user.userId,
      requestBaseUrl,
    );

    return {
      url: urlInfo.url,
      previewUrl: urlInfo.previewUrl,
      downloadUrl: urlInfo.downloadUrl,
      filename: urlInfo.filename,
      mimeType: urlInfo.mimeType,
      expiresIn: urlInfo.expiresIn,
    };
  }
}
