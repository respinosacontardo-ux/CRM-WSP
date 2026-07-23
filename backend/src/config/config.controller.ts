import { Body, Controller, Get, Put } from '@nestjs/common';
import { ConfigService } from './config.service';
import { OpenRouterService } from './openrouter.service';
import { UpdateConfigDto } from './dto/config.dto';

@Controller('config')
export class ConfigController {
  constructor(
    private readonly configService: ConfigService,
    private readonly openRouter: OpenRouterService,
  ) {}

  /** GET /api/config — sanitized configuration (no secrets). */
  @Get()
  getConfig() {
    return this.configService.getSanitizedConfig();
  }

  /** PUT /api/config — partial update; empty secrets are ignored. */
  @Put()
  updateConfig(@Body() dto: UpdateConfigDto) {
    return this.configService.updateConfig(dto);
  }

  /** GET /api/config/models — live OpenRouter catalogue (curated first). */
  @Get('models')
  listModels() {
    return this.openRouter.listModels();
  }
}
