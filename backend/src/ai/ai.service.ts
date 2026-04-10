import {
  Injectable,
  Logger,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly genAI: GoogleGenerativeAI | null;
  private readonly configuredKeyName: 'GEMINI_API_KEY' | 'GOOGLE_API_KEY' | null;
  private readonly modelNames: string[];
  private activeModelIndex = 0;
  private readonly authErrorPatterns = [
    'api key not valid',
    'invalid api key',
    'invalid key',
    'permission denied',
    'insufficient authentication',
    'unauthenticated',
    'forbidden',
  ];
  private readonly modelErrorPatterns = [
    'model not found',
    'is not found for api version',
    'unsupported model',
    'is not supported',
    'unknown model',
  ];
  private readonly rateLimitPatterns = [
    'rate limit',
    'quota',
    'resource exhausted',
    'too many requests',
  ];
  private readonly transientPatterns = ['temporarily unavailable', 'service unavailable', 'deadline'];

  constructor(private readonly configService: ConfigService) {
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();
    const googleApiKey = this.configService.get<string>('GOOGLE_API_KEY')?.trim();
    const apiKey = geminiApiKey || googleApiKey;
    this.modelNames = this.buildModelCandidates();

    if (apiKey) {
      this.configuredKeyName = geminiApiKey ? 'GEMINI_API_KEY' : 'GOOGLE_API_KEY';
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.logger.log(
        `Gemini AI initialized using ${this.configuredKeyName} with model candidates: ${this.modelNames.join(', ')}`,
      );
    } else {
      this.configuredKeyName = null;
      this.genAI = null;
      this.logger.warn(
        'AI API key not configured - set GEMINI_API_KEY (or GOOGLE_API_KEY) to enable AI features',
      );
    }
  }

  private ensureModelAvailable(): void {
    if (!this.genAI || this.modelNames.length === 0) {
      throw new ServiceUnavailableException(
        'AI service is not configured. Please set GEMINI_API_KEY (or GOOGLE_API_KEY).',
      );
    }
  }

  private buildModelCandidates(): string[] {
    const configuredModel = this.configService.get<string>('GEMINI_MODEL')?.trim();
    const configuredGoogleModel = this.configService.get<string>('GOOGLE_MODEL')?.trim();

    const preferred = [configuredModel, configuredGoogleModel].filter(
      (value): value is string => Boolean(value),
    );

    // Keep currently supported Google AI Studio models first.
    const defaults = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];

    return [...new Set([...preferred, ...defaults])];
  }

  private getActiveModelName(): string {
    return this.modelNames[this.activeModelIndex] ?? this.modelNames[0];
  }

  private extractResponseText(result: any): string {
    const text = result?.response?.text?.();
    if (typeof text === 'string' && text.trim().length > 0) {
      return text.trim();
    }

    const parts = result?.response?.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
      const combined = parts
        .map((part: { text?: string }) => (typeof part?.text === 'string' ? part.text : ''))
        .join('')
        .trim();
      if (combined.length > 0) {
        return combined;
      }
    }

    throw new Error('AI response did not include text content');
  }

  private sanitizeText(value: string): string {
    return value
      .replace(/AIza[0-9A-Za-z\-_]{20,}/g, '[REDACTED_API_KEY]')
      .replace(/(api[_-]?key\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]');
  }

  private sanitizeUnknown(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.sanitizeText(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeUnknown(item));
    }

    if (value && typeof value === 'object') {
      const input = value as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(input).map(([key, val]) => [key, this.sanitizeUnknown(val)]),
      );
    }

    return value;
  }

  private buildAiErrorDetails(error: unknown): Record<string, unknown> {
    const err = error as {
      message?: string;
      stack?: string;
      status?: number;
      code?: number | string;
      response?: {
        status?: number;
        statusText?: string;
        data?: unknown;
      };
    };

    return {
      configuredKeyName: this.configuredKeyName,
      activeModel: this.getActiveModelName(),
      modelCandidates: this.modelNames,
      message: this.sanitizeText(err?.message || 'Unknown AI error'),
      code: err?.code,
      status: err?.status || err?.response?.status,
      statusText: err?.response?.statusText,
      responseData: this.sanitizeUnknown(err?.response?.data),
      stack: this.sanitizeUnknown(err?.stack),
    };
  }

  private isRetryableModelError(error: unknown): boolean {
    const err = error as {
      status?: number;
      message?: string;
      response?: { status?: number };
    };

    const status = err?.status || err?.response?.status;
    const message = (err?.message || '').toLowerCase();

    return status === 404 || this.modelErrorPatterns.some((pattern) => message.includes(pattern));
  }

  private classifyAiError(error: unknown): 'auth' | 'rate_limit' | 'model' | 'transient' | 'config' | 'other' {
    const err = error as {
      status?: number;
      message?: string;
      response?: { status?: number };
    };
    const status = err?.status || err?.response?.status;
    const message = (err?.message || '').toLowerCase();

    if (!this.genAI || !this.configuredKeyName) {
      return 'config';
    }

    if (status === 401 || status === 403 || this.authErrorPatterns.some((p) => message.includes(p))) {
      return 'auth';
    }

    if (status === 429 || this.rateLimitPatterns.some((p) => message.includes(p))) {
      return 'rate_limit';
    }

    if (
      status === 404 ||
      status === 400 ||
      status === 422 ||
      this.modelErrorPatterns.some((p) => message.includes(p))
    ) {
      return 'model';
    }

    if (
      status === 408 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      this.transientPatterns.some((p) => message.includes(p))
    ) {
      return 'transient';
    }

    return 'other';
  }

  private toHttpException(error: unknown, defaultMessage: string): Error {
    const err = error as {
      message?: string;
    };
    const message = err?.message || defaultMessage;
    const classification = this.classifyAiError(error);

    switch (classification) {
      case 'config':
        return new ServiceUnavailableException(
          'AI service is not configured. Please set GEMINI_API_KEY (or GOOGLE_API_KEY).',
        );
      case 'auth':
        return new UnauthorizedException(
          'AI authentication failed. Verify your Google AI Studio API key and permissions.',
        );
      case 'rate_limit':
        return new ServiceUnavailableException('AI rate limit reached. Please try again shortly.');
      case 'model':
        return new BadGatewayException(
          `AI model request failed for all configured models. Last error: ${this.sanitizeText(message)}`,
        );
      case 'transient':
        return new ServiceUnavailableException('AI provider is temporarily unavailable. Please retry.');
      default:
        return new InternalServerErrorException(defaultMessage);
    }
  }

  private async generateWithFallback(prompt: string): Promise<string> {
    this.ensureModelAvailable();

    let lastError: unknown = null;
    const startIndex = this.activeModelIndex;

    for (let attempt = 0; attempt < this.modelNames.length; attempt += 1) {
      const index = (startIndex + attempt) % this.modelNames.length;
      const modelName = this.modelNames[index];

      try {
        const model = this.genAI!.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = this.extractResponseText(result);
        if (index !== this.activeModelIndex) {
          this.logger.warn(
            `Switched AI model from ${this.getActiveModelName()} to ${modelName} after fallback`,
          );
          this.activeModelIndex = index;
        }
        return text.trim();
      } catch (error) {
        lastError = error;
        const classification = this.classifyAiError(error);
        const retryable = this.isRetryableModelError(error);
        this.logger.warn(
          `AI generation failed on model ${modelName}. classification=${classification} retryable=${retryable}. ${this.sanitizeText((error as { message?: string })?.message || 'Unknown error')}`,
        );
        if (!retryable) {
          break;
        }
      }
    }

    throw lastError || new Error('AI generation failed');
  }

  async generateTaskDescription(prompt: string): Promise<string> {
    this.ensureModelAvailable();

    try {
      const systemPrompt = `You are a helpful assistant that generates clear, concise task descriptions for project management. 
Given a brief prompt or idea, create a professional task description that includes:
- A clear statement of what needs to be done
- Key objectives or deliverables
- Any relevant context

Keep the description focused and actionable. Do not include headers or bullet points unless necessary.
Maximum length: 300 words.`;

      const text = await this.generateWithFallback(
        `${systemPrompt}\n\nGenerate a task description for: ${prompt}`,
      );

      this.logger.debug(`Generated description for prompt: "${prompt.substring(0, 50)}..."`);

      return text.trim();
    } catch (error) {
      const details = this.buildAiErrorDetails(error);
      this.logger.error(
        `Failed to generate task description: ${details.message as string}`,
        JSON.stringify(details),
      );
      throw this.toHttpException(error, 'Failed to generate task description');
    }
  }

  async suggestSubtasks(taskTitle: string): Promise<string[]> {
    this.ensureModelAvailable();

    try {
      const systemPrompt = `You are a helpful assistant that breaks down tasks into actionable subtasks for project management.
Given a task title, suggest 3-6 logical subtasks that would help complete the main task.
Return ONLY a JSON array of strings, with no additional text or formatting.
Example output: ["Subtask 1", "Subtask 2", "Subtask 3"]`;

      const text = (
        await this.generateWithFallback(
          `${systemPrompt}\n\nSuggest subtasks for this task: ${taskTitle}`,
        )
      ).trim();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        this.logger.warn(`Failed to parse subtasks JSON from response: ${text}`);
        return [];
      }

      const subtasks = JSON.parse(jsonMatch[0]) as string[];

      if (!Array.isArray(subtasks) || !subtasks.every((s) => typeof s === 'string')) {
        this.logger.warn('Invalid subtasks format received');
        return [];
      }

      this.logger.debug(`Generated ${subtasks.length} subtasks for: "${taskTitle}"`);

      return subtasks.slice(0, 6);
    } catch (error) {
      const details = this.buildAiErrorDetails(error);
      this.logger.error(
        `Failed to suggest subtasks: ${details.message as string}`,
        JSON.stringify(details),
      );
      throw this.toHttpException(error, 'Failed to suggest subtasks');
    }
  }

  async getTaskHelp(
    taskTitle: string,
    taskDescription: string | null,
    userQuestion: string,
  ): Promise<string> {
    this.ensureModelAvailable();

    try {
      const systemPrompt = `You are a helpful AI assistant for project management. A user is working on a task and needs your help.
Provide concise, actionable advice. Keep responses focused and practical.
Do not use markdown headers. Use plain text with occasional bullet points if needed.
Maximum response length: 400 words.`;

      const taskContext = taskDescription
        ? `Task: "${taskTitle}"\nDescription: ${taskDescription}`
        : `Task: "${taskTitle}"`;

      const text = await this.generateWithFallback(
        `${systemPrompt}\n\n${taskContext}\n\nUser question: ${userQuestion}`,
      );

      this.logger.debug(`Generated help for task: "${taskTitle.substring(0, 50)}..."`);

      return text.trim();
    } catch (error) {
      const details = this.buildAiErrorDetails(error);
      this.logger.error(
        `Failed to generate task help: ${details.message as string}`,
        JSON.stringify(details),
      );
      throw this.toHttpException(error, 'Failed to generate AI response');
    }
  }

  isConfigured(): boolean {
    return this.genAI !== null;
  }
}
