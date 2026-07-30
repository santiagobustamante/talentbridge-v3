import { IsString, MaxLength } from 'class-validator';

export class UpdateParameterDto {
  @IsString()
  @MaxLength(2000)
  value!: string;
}
