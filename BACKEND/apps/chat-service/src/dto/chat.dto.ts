import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

/** Body de POST /api/chat/conversations. `companyId` no se incluye: siempre se toma del usuario autenticado (`user.sub`), nunca del body. */
export class CreateConversationDto {
  @IsInt()
  @IsPositive()
  candidateId!: number;
}

/** Body de POST /api/chat/conversations/:id/messages. */
export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body!: string;
}

/** Body de POST /api/chat/conversations/:id/block. */
export class BlockConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
