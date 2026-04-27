import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType } from '../report.entity';

export class CreateReportDto {
  @ApiProperty({
    description: 'Numeric ID of the confession being reported.',
    example: 101,
  })
  @IsInt()
  confessionId: number;

  @ApiProperty({
    enum: ReportType,
    description: 'Category of the report.',
    example: ReportType.OFFENSIVE,
  })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiPropertyOptional({
    description: 'Optional additional context for the report (max 500 chars).',
    example: 'This post contains hate speech targeting a specific group.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
