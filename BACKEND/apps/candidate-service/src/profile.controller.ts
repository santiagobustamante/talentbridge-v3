import { Controller, Get, Patch, Body, UseGuards, Post } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@app/auth';
import { ProfileService } from './profile.service';
import { ProfileDto } from './dto/profile.dto';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getProfile(@CurrentUser() user: { sub: number }) {
    return this.profileService.getProfile(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  async updateProfile(
    @CurrentUser() user: { sub: number },
    @Body() dto: ProfileDto,
  ) {
    return this.profileService.updateProfile(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('generate-slug')
  async generateSlug(@CurrentUser() user: { sub: number }) {
    return this.profileService.generateSlug(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('views')
  async getProfileViews(@CurrentUser() user: { sub: number }) {
    return this.profileService.getProfileViews(user.sub);
  }
}
