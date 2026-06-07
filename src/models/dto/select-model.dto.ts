import { IsIn } from 'class-validator';
import { MODEL_IDS } from '@app/models/available-models';

export class SelectModelDto {
  @IsIn(MODEL_IDS)
  model!: string;
}
