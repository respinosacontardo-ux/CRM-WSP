import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { Observable, map, merge, interval } from 'rxjs';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  /**
   * Single SSE endpoint: GET /api/events
   * The browser connects with the native EventSource and receives every app
   * event. A periodic heartbeat keeps proxies from closing the connection.
   */
  @Sse()
  stream(): Observable<MessageEvent> {
    const events$ = this.events.asObservable().pipe(
      map((event): MessageEvent => ({ data: event })),
    );

    const heartbeat$ = interval(25000).pipe(
      map((): MessageEvent => ({ data: { type: 'heartbeat' } })),
    );

    return merge(events$, heartbeat$);
  }
}
