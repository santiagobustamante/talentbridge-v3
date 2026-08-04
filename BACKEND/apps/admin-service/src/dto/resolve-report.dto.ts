import { IsIn } from 'class-validator';

export class ResolveReportDto {
  @IsIn(['DISMISSED', 'ACTION_TAKEN'])
  status: 'DISMISSED' | 'ACTION_TAKEN';
}
