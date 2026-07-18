import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@app/auth';
import { ChatService } from './chat.service';

/**
 * Controller HTTP del chat candidato↔empresa. Maneja todo lo que es CRUD y
 * consulta de datos (crear/listar conversaciones, paginar mensajes, marcar
 * como leído, bloquear/desbloquear). El envío en tiempo real hacia los
 * sockets conectados lo dispara el `ChatService` internamente a través de
 * `ChatGateway` después de persistir en base de datos, no este controller.
 * Todas las rutas requieren estar autenticado.
 */
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** GET /api/chat/conversations — lista las conversaciones del usuario autenticado (candidato o empresa). */
  @UseGuards(JwtAuthGuard)
  @Get('conversations')
  async getConversations(@CurrentUser() user: { sub: number }) {
    return this.chatService.getConversations(user.sub);
  }

  /**
   * POST /api/chat/conversations — crea (o recupera si ya existe) la
   * conversación entre un candidato y una empresa. Solo lo puede iniciar
   * una empresa (rol COMPANY): el candidato responde pero no arranca el
   * primer contacto, para evitar spam de candidatos hacia empresas.
   */
  @UseGuards(JwtAuthGuard)
  @Post('conversations')
  async createConversation(@CurrentUser() user: { sub: number; role?: string }, @Body() body: { candidateId?: number; companyId?: number }) {
    if (user.role === 'CANDIDATE') {
      throw new ForbiddenException('Solo las empresas pueden iniciar una conversación');
    }
    return this.chatService.createOrGetConversation(body.candidateId || 0, user.sub);
  }

  /** GET /api/chat/conversations/:id — detalle de una conversación puntual, validando que el usuario participe en ella. */
  @UseGuards(JwtAuthGuard)
  @Get('conversations/:id')
  async getConversation(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.chatService.getConversation(user.sub, +id);
  }

  /** GET /api/chat/conversations/:id/messages — historial paginado de mensajes de una conversación (más antiguos primero). */
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

  /** POST /api/chat/conversations/:id/messages — envía un mensaje; se persiste en BD y se retransmite por WebSocket al destinatario. */
  @UseGuards(JwtAuthGuard)
  @Post('conversations/:id/messages')
  async sendMessage(@CurrentUser() user: { sub: number }, @Param('id') id: string, @Body() body: { body: string }) {
    return this.chatService.sendMessage(user.sub, +id, body.body);
  }

  /** PATCH /api/chat/conversations/:id/read — marca como leídos los mensajes recibidos en la conversación. */
  @UseGuards(JwtAuthGuard)
  @Patch('conversations/:id/read')
  async markAsRead(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.chatService.markAsRead(user.sub, +id);
  }

  /** GET /api/chat/unread-count — total de mensajes sin leer del usuario autenticado, para el badge de notificación. */
  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: { sub: number }) {
    return this.chatService.getUnreadCount(user.sub);
  }

  /** POST /api/chat/conversations/:id/block — bloquea a la otra parte de la conversación (deja de poder escribirle). */
  @UseGuards(JwtAuthGuard)
  @Post('conversations/:id/block')
  async blockConversation(@CurrentUser() user: { sub: number }, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.chatService.blockConversation(user.sub, +id, body.reason);
  }

  /** DELETE /api/chat/conversations/:id/block — revierte el bloqueo hecho anteriormente por el usuario autenticado. */
  @UseGuards(JwtAuthGuard)
  @Delete('conversations/:id/block')
  async unblockConversation(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.chatService.unblockConversation(user.sub, +id);
  }
}
