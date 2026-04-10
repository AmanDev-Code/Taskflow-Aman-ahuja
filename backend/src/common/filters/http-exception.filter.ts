import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

interface ValidationError {
  property: string;
  constraints?: Record<string, string>;
  children?: ValidationError[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let fields: Record<string, string> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, any>;

        if (responseObj.message) {
          if (Array.isArray(responseObj.message)) {
            fields = this.parseValidationErrors(responseObj.message);
            message = 'validation failed';
          } else {
            message = responseObj.message;
          }
        } else {
          message = responseObj.error || 'Error';
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    const errorResponse: Record<string, any> = {
      error: message,
      statusCode: status,
    };

    if (fields) {
      errorResponse.fields = fields;
    }

    response.status(status).send(errorResponse);
  }

  private parseValidationErrors(
    errors: (string | ValidationError)[],
  ): Record<string, string> {
    const fields: Record<string, string> = {};

    for (const error of errors) {
      if (typeof error === 'string') {
        const match = error.match(/^(\w+)\s+(.+)$/);
        if (match) {
          fields[match[1]] = match[2];
        } else {
          const fieldMatch = error.match(/(\w+)/);
          if (fieldMatch) {
            fields[fieldMatch[1]] = error;
          }
        }
      } else if (typeof error === 'object' && error.property) {
        if (error.constraints) {
          const constraintMessages = Object.values(error.constraints);
          fields[error.property] = constraintMessages[0] || 'is invalid';
        }
        if (error.children && error.children.length > 0) {
          const childFields = this.parseValidationErrors(error.children);
          for (const [key, value] of Object.entries(childFields)) {
            fields[`${error.property}.${key}`] = value;
          }
        }
      }
    }

    return fields;
  }
}
