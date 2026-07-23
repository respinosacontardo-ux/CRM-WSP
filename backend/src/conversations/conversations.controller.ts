import { Controller, Get, Param } from '@nestjs/common';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  listThreads() {
    return this.conversationsService.listThreads();
  }

  @Get(':id')
  getThread(@Param('id') id: string) {
    return this.conversationsService.getThread(id);
  }
}
