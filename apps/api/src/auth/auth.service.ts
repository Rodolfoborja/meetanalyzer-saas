import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { User, Organization, Role } from '@prisma/client';

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateGoogleUser(profile: GoogleProfile): Promise<User & { organization: Organization }> {
    // Check if user exists
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.id },
      include: { organization: true },
    });

    if (user) {
      // Update profile info
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: profile.name,
          avatar: profile.picture,
        },
        include: { organization: true },
      });
      return user;
    }

    // Check if email exists (invited user)
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: profile.email },
      include: { organization: true },
    });

    if (existingByEmail) {
      // Link Google account to existing user
      user = await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId: profile.id,
          name: profile.name || existingByEmail.name,
          avatar: profile.picture,
        },
        include: { organization: true },
      });
      return user;
    }

    // Create new organization and user
    const slug = this.generateSlug(profile.email);
    
    const organization = await this.prisma.organization.create({
      data: {
        slug,
        name: `${profile.name}'s Workspace`,
      },
    });

    user = await this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        avatar: profile.picture,
        googleId: profile.id,
        organizationId: organization.id,
        role: Role.OWNER,
      },
      include: { organization: true },
    });

    return user;
  }

  generateToken(user: User & { organization: Organization }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User & { organization: Organization } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });
    return user;
  }

  private generateSlug(email: string): string {
    const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const random = Math.random().toString(36).substring(2, 6);
    return `${base}-${random}`;
  }
}
