import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@app/auth';
import { CompanyProfileService } from './company-profile.service';
import { CompanyProfileDto } from './dto/company-profile.dto';

@Controller('company')
export class CompanyProfileController {
  constructor(private readonly companyProfileService: CompanyProfileService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: { sub: number }) {
    return this.companyProfileService.getProfile(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@CurrentUser() user: { sub: number }, @Body() dto: CompanyProfileDto) {
    return this.companyProfileService.updateProfile(user.sub, dto);
  }

  @Get('public/:id')
  async getPublicProfile(@Param('id') id: string) {
    return this.companyProfileService.getPublicProfile(+id);
  }
}
