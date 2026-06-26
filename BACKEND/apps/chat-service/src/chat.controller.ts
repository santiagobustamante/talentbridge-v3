import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@app/auth';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Get('conversations')
  async getConversations(@CurrentUser() user: { sub: number }) {
    return this.chatService.getConversations(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('conversations')
  async createConversation(@CurrentUser() user: { sub: number; role?: string }, @Body() body: { candidateId?: number; companyId?: number }) {
    if (user.role === 'CANDIDATE') {
      throw new ForbiddenException('Solo las empresas pueden iniciar una conversación');
    }
    return this.chatService.createOrGetConversation(body.candidateId || 0, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations/:id')
  async getConversation(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.chatService.getConversation(user.sub, +id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations/:id/messages')
  async getMessages(
    @CurrentUser() user: { sub: number },
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(user.sub, +id, page ? +page : 1, limit ? +limit : 30);
  }

  @UseGuards(JwtAuthGuard)
  @Post('conversations/:id/messages')
  async sendMessage(@CurrentUser() user: { sub: number }, @Param('id') id: string, @Body() body: { body: string }) {
    return this.chatService.sendMessage(user.sub, +id, body.body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('conversations/:id/read')
  async markAsRead(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.chatService.markAsRead(user.sub, +id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: { sub: number }) {
    return this.chatService.getUnreadCount(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('conversations/:id/block')
  async blockConversation(@CurrentUser() user: { sub: number }, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.chatService.blockConversation(user.sub, +id, body.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('conversations/:id/block')
  async unblockConversation(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.chatService.unblockConversation(user.sub, +id);
  }
}
