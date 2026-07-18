import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@app/auth';
import { AssistantService } from './assistant.service';
import { AssistantMessageDto } from './dto/assistant-message.dto';

/**
 * Controller HTTP del asistente virtual "Joaquín". Un único endpoint recibe
 * el mensaje del usuario (candidato o empresa) y devuelve la respuesta del
 * modelo ya procesada (texto + acciones sugeridas + posibles tarjetas de
 * datos). Requiere sesión autenticada.
 */
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  /**
   * POST /api/assistant/message — envía un mensaje a Joaquín. El rol del
   * usuario (CANDIDATE o COMPANY) se toma del JWT, no del body, para que el
   * asistente arme el contexto y las rutas sugeridas correctas según quién
   * pregunta.
   */
  @UseGuards(JwtAuthGuard)
  @Post('message')
  async sendMessage(@CurrentUser() user: { sub: number; role?: string }, @Body() body: AssistantMessageDto) {
    return this.assistantService.processMessage(user.sub, user.role || 'CANDIDATE', body.message, body.history);
  }
}
