import { IsIn } from 'class-validator';

const STATUSES = ['PENDING', 'REVIEWED', 'PRESELECTED', 'REJECTED', 'HIRED'] as const;

export class UpdateApplicationStatusDto {
  @IsIn(STATUSES)
  status: string;
}
