import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { AiService } from './ai.service';

class GenerateDescriptionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(500)
  prompt: string;
}

class SuggestSubtasksDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  taskTitle: string;
}

class AiHelpDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  taskTitle: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  taskDescription?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(500)
  question: string;
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  @Public()
  @HttpCode(HttpStatus.OK)
  getStatus() {
    return { configured: this.aiService.isConfigured() };
  }

  @Post('generate-description')
  @HttpCode(HttpStatus.OK)
  async generateDescription(@Body() dto: GenerateDescriptionDto) {
    const description = await this.aiService.generateTaskDescription(dto.prompt);
    return { description };
  }

  @Post('suggest-subtasks')
  @HttpCode(HttpStatus.OK)
  async suggestSubtasks(@Body() dto: SuggestSubtasksDto) {
    const subtasks = await this.aiService.suggestSubtasks(dto.taskTitle);
    return { subtasks };
  }

  @Post('help')
  @HttpCode(HttpStatus.OK)
  async getTaskHelp(@Body() dto: AiHelpDto) {
    const response = await this.aiService.getTaskHelp(
      dto.taskTitle,
      dto.taskDescription || null,
      dto.question,
    );
    return { response };
  }
}
