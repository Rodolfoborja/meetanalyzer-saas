import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Get('current')
  async getCurrent(@CurrentUser() user: any) {
    return this.organizationsService.findById(user.organizationId);
  }

  @Patch('current')
  async updateCurrent(@CurrentUser() user: any, @Body() data: any) {
    return this.organizationsService.update(user.organizationId, data);
  }
}
