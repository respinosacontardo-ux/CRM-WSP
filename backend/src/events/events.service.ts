import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { AppEvent } from './events.types';

/**
 * In-process pub/sub for realtime updates. Any service can call `emit()` and
 * every connected browser receives the event over SSE. Single-tenant, single
 * process, so an in-memory Subject is enough (no external broker needed).
 */
@Injectable()
export class EventsService {
  private readonly stream$ = new Subject<AppEvent>();

  emit(event: AppEvent): void {
    this.stream$.next(event);
  }

  asObservable(): Observable<AppEvent> {
    return this.stream$.asObservable();
  }
}
