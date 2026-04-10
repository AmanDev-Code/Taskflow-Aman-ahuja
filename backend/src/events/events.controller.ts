import {
  Controller,
  Sse,
  Param,
  ParseUUIDPipe,
  MessageEvent,
  Req,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Observable, map, interval, mergeWith } from 'rxjs';
import { FastifyRequest } from 'fastify';
import { createHmac } from 'crypto';
import { EventsService, AppEvent } from './events.service';
import { AuthService, JwtPayload } from '../auth/auth.service';
import { MembersService } from '../members/members.service';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';

@Controller('events')
export class EventsController {
  private readonly jwtSecret: string;

  constructor(
    private readonly eventsService: EventsService,
    private readonly authService: AuthService,
    private readonly membersService: MembersService,
    private readonly configService: ConfigService,
  ) {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    this.jwtSecret = secret;
  }

  @Public()
  @Sse('projects/:projectId')
  async subscribeToProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Req() request: FastifyRequest,
  ): Promise<Observable<MessageEvent>> {
    const payload = await this.authenticateRequest(request);
    const hasAccess = await this.membersService.hasProjectAccess(projectId, payload.sub);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this project');
    }

    const heartbeat$ = interval(30000).pipe(
      map(() => ({ data: { type: 'heartbeat' } } as MessageEvent)),
    );

    const events$ = this.eventsService.getProjectEvents(projectId).pipe(
      map((event: AppEvent) => ({
        data: event,
      } as MessageEvent)),
    );

    return events$.pipe(mergeWith(heartbeat$));
  }

  @Public()
  @Sse()
  subscribeToAll(): Observable<MessageEvent> {
    const heartbeat$ = interval(30000).pipe(
      map(() => ({ data: { type: 'heartbeat' } } as MessageEvent)),
    );

    const events$ = this.eventsService.getAllEvents().pipe(
      map((event: AppEvent) => ({
        data: event,
      } as MessageEvent)),
    );

    return events$.pipe(mergeWith(heartbeat$));
  }

  private async authenticateRequest(request: FastifyRequest): Promise<JwtPayload> {
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    try {
      const payload = this.verifyJwt(token);
      const user = await this.authService.validateUser(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private verifyJwt(token: string): JwtPayload {
    const [, payloadPart, signaturePart] = token.split('.');
    if (!payloadPart || !signaturePart) {
      throw new UnauthorizedException('Malformed JWT');
    }

    const hmac = createHmac('sha256', this.jwtSecret);
    hmac.update(`${token.split('.')[0]}.${payloadPart}`);
    const expectedSignature = hmac
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    if (expectedSignature !== signaturePart) {
      throw new UnauthorizedException('Invalid token signature');
    }

    const payloadJson = Buffer.from(payloadPart, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson) as JwtPayload & { exp?: number };
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new UnauthorizedException('Token expired');
    }

    return { sub: payload.sub, email: payload.email };
  }

  private extractToken(request: FastifyRequest): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }

    const query = request.query as Record<string, unknown>;
    const queryToken =
      (typeof query.token === 'string' && query.token) ||
      (typeof query.access_token === 'string' && query.access_token) ||
      (typeof query.authToken === 'string' && query.authToken);
    if (queryToken) {
      return queryToken;
    }

    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      return null;
    }

    const cookieMap = new Map<string, string>();
    for (const pair of cookieHeader.split(';')) {
      const [rawKey, ...rawValueParts] = pair.trim().split('=');
      if (!rawKey || rawValueParts.length === 0) {
        continue;
      }
      cookieMap.set(rawKey, decodeURIComponent(rawValueParts.join('=')));
    }

    return (
      cookieMap.get('access_token') ||
      cookieMap.get('token') ||
      cookieMap.get('auth_token') ||
      null
    );
  }
}
