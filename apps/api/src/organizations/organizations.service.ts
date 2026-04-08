import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.organization.findUnique({ where: { id } });
  }

  async findBySlug(slug: string) {
    return this.prisma.organization.findUnique({ where: { slug } });
  }

  async update(id: string, data: any) {
    return this.prisma.organization.update({ where: { id }, data });
  }
}
