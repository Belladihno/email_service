import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsObject,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum NotificationTypeDto {
  EMAIL = 'email',
  PUSH = 'push',
}

export enum NotificationStatusDto {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export class UserDataDto {
  @ApiProperty({ example: 'John Doe', description: 'User name' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'https://example.com/verify',
    description: 'Action link',
  })
  @IsString()
  link: string;

  @ApiProperty({
    example: { company: 'Acme Corp' },
    description: 'Additional metadata',
    required: false,
  })
  @IsObject()
  @IsOptional()
  meta?: Record<string, string>;
}

export class NotificationMessageDto {
  @ApiProperty({
    enum: NotificationTypeDto,
    example: NotificationTypeDto.EMAIL,
    description: 'Type of notification',
  })
  @IsEnum(NotificationTypeDto)
  notification_type: NotificationTypeDto;

  @ApiProperty({ example: 'user-123', description: 'User ID' })
  @IsString()
  user_id: string;

  @ApiProperty({ example: 'WELCOME_EMAIL', description: 'Template code' })
  @IsString()
  template_code: string;

  @ApiProperty({ type: UserDataDto, description: 'Template variables' })
  @IsObject()
  variables: UserDataDto;

  @ApiProperty({
    example: 'req-123456',
    description: 'Unique request ID for idempotency',
  })
  @IsString()
  request_id: string;

  @ApiProperty({ example: 1, description: 'Message priority' })
  priority: number;

  @ApiProperty({
    example: { source: 'web' },
    description: 'Additional metadata',
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string>;
}

export class EmailLogDto {
  @ApiProperty({ example: 'log-uuid-123', description: 'Email log ID' })
  id: string;

  @ApiProperty({ example: 'req-123456', description: 'Request ID' })
  request_id: string;

  @ApiProperty({
    example: 'notif-uuid-456',
    description: 'Notification ID',
    nullable: true,
  })
  notification_id: string | null;

  @ApiProperty({ example: 'user-123', description: 'User ID' })
  user_id: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'WELCOME_EMAIL', description: 'Template code' })
  template_code: string;

  @ApiProperty({
    enum: NotificationStatusDto,
    example: NotificationStatusDto.DELIVERED,
    description: 'Email status',
  })
  @IsEnum(NotificationStatusDto)
  status: NotificationStatusDto;

  @ApiProperty({ example: 0, description: 'Number of retry attempts' })
  retry_count: number;

  @ApiProperty({
    example: null,
    description: 'Error message if failed',
    nullable: true,
  })
  error_message: string | null;

  @ApiProperty({
    example: '2025-11-11T04:15:48.000Z',
    description: 'Time sent',
    nullable: true,
  })
  sent_at: string | null;

  @ApiProperty({
    example: '2025-11-11T04:15:48.000Z',
    description: 'Time created',
  })
  created_at: string;

  @ApiProperty({
    example: '2025-11-11T04:15:48.000Z',
    description: 'Time updated',
  })
  updated_at: string;
}
