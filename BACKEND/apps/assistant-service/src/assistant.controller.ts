import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@app/auth';
import { AssistantService } from './assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @UseGuards(JwtAuthGuard)
  @Post('message')
  async sendMessage(@CurrentUser() user: { sub: number; role?: string }, @Body() body: { message: string }) {
    return this.assistantService.processMessage(user.sub, user.role || 'CANDIDATE', body.message);
  }
}
