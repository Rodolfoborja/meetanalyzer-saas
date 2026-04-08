import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TemplatesService, TemplateConfig } from './templates.service';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async getTemplates(@CurrentUser() user: any) {
    return this.templatesService.getTemplates(user.organizationId);
  }

  @Get(':idOrType')
  async getTemplate(
    @Param('idOrType') idOrType: string,
    @CurrentUser() user: any,
  ) {
    return this.templatesService.getTemplate(user.organizationId, idOrType);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async createTemplate(
    @CurrentUser() user: any,
    @Body()
    body: {
      name: string;
      description?: string;
      type: string;
      icon?: string;
      config: TemplateConfig;
    },
  ) {
    return this.templatesService.createTemplate(user.organizationId, body);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async updateTemplate(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body()
    body: {
      name?: string;
      description?: string;
      config?: TemplateConfig;
      isDefault?: boolean;
    },
  ) {
    return this.templatesService.updateTemplate(id, user.organizationId, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async deleteTemplate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.templatesService.deleteTemplate(id, user.organizationId);
  }
}
