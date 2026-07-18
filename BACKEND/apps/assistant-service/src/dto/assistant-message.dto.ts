import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class ChatHistoryItemDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(2000)
  content: string;
}

export class AssistantMessageDto {
  @IsString()
  @MaxLength(2000)
  message: string;

  /** Últimos mensajes de la conversación (sin persistir en BD) para que el
   *  modelo tenga contexto de lo ya hablado — el frontend los manda de su
   *  propio historial en memoria en cada request. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];
}
