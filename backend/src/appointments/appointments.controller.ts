import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /** GET /api/appointments?from=ISO&to=ISO — used by month/week calendar views. */
  @Get()
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.appointmentsService.findAll(from, to);
  }

  /** GET /api/appointments/availability?date=YYYY-MM-DD&meetingType=... */
  @Get('availability')
  getAvailability(
    @Query('date') date: string,
    @Query('meetingType') meetingType: string,
  ) {
    return this.appointmentsService.getAvailability(date, meetingType);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto, 'manual');
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }
}
