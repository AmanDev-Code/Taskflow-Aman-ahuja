import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable, filter } from 'rxjs';

export interface TaskEvent {
  type: 'task_created' | 'task_updated' | 'task_deleted';
  projectId: string;
  taskId: string;
  data?: any;
  userId: string;
}

export interface ProjectEvent {
  type: 'project_created' | 'project_updated' | 'project_deleted';
  projectId: string;
  data?: any;
  userId: string;
}

export type AppEvent = TaskEvent | ProjectEvent;

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly eventSubject = new Subject<AppEvent>();

  emit(event: AppEvent): void {
    this.logger.debug(`Emitting event: ${event.type}`);
    this.eventSubject.next(event);
  }

  getProjectEvents(projectId: string): Observable<AppEvent> {
    return this.eventSubject.asObservable().pipe(
      filter((event) => {
        if ('projectId' in event) {
          return event.projectId === projectId;
        }
        return false;
      }),
    );
  }

  getAllEvents(): Observable<AppEvent> {
    return this.eventSubject.asObservable();
  }
}
