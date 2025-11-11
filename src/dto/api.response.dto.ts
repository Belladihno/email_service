import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 100, description: 'Total number of items' })
  total: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Total number of pages' })
  total_pages: number;

  @ApiProperty({ example: true, description: 'Has next page' })
  has_next: boolean;

  @ApiProperty({ example: false, description: 'Has previous page' })
  has_previous: boolean;
}

export class ApiResponseDto<T> {
  @ApiProperty({ example: true, description: 'Request success status' })
  success: boolean;

  @ApiProperty({ description: 'Response data', required: false })
  data?: T;

  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;

  @ApiProperty({ description: 'Error message if any', required: false })
  error?: string;

  @ApiProperty({
    type: PaginationMetaDto,
    description: 'Pagination metadata',
    required: false,
  })
  meta?: PaginationMetaDto;
}
