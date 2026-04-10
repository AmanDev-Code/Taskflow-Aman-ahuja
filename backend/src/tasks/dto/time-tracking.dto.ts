import { IsOptional, IsInt, Min } from 'class-validator';

export class AddTimeDto {
  @IsInt()
  @Min(1)
  minutes: number;
}

export class TimerStatusResponse {
  isRunning: boolean;
  startedAt: string | null;
  elapsedMinutes: number;
  totalTimeSpent: number;
}
