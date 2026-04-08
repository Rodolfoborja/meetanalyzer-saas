import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Iniciar login con Google' })
  async googleAuth() {
    // Redirect to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback de Google OAuth' })
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const user = req.user;
    const token = this.authService.generateToken(user);
    
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
    
    // Redirect to frontend with token
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener usuario actual' })
  async me(@CurrentUser() user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      organization: {
        id: user.organization.id,
        slug: user.organization.slug,
        name: user.organization.name,
        plan: user.organization.plan,
      },
    };
  }
}
