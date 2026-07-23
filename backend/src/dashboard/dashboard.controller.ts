import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** GET /api/dashboard — metrics + recent conversations for the home screen. */
  @Get()
  getMetrics() {
    return this.dashboardService.getMetrics();
  }
}
