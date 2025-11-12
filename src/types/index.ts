export enum NotificationType {
  EMAIL = 'email',
  PUSH = 'push',
}

export enum NotificationStatus {
  DELIVERED = 'delivered',
  PENDING = 'pending',
  FAILED = 'failed',
}

export enum CircuitBreakerStateEnum {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface UserData {
  name: string;
  link: string;
  meta?: Record<string, string>;
}

export interface NotificationMessage {
  notification_type: NotificationType;
  user_id: string;
  template_code: string;
  variables: UserData;
  request_id: string;
  priority: number;
  metadata?: Record<string, string>;
}

export interface UserPreference {
  email: boolean;
  push: boolean;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  push_token?: string;
  preferences: UserPreference;
}

export interface TemplateResponse {
  id: string;
  code: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  language: string;
}

export interface StatusUpdatePayload {
  notification_id: string;
  status: NotificationStatus;
  timestamp?: string;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  page: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface CircuitBreakerConfig {
  threshold: number;
  timeout: number;
  resetTimeout: number;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface RabbitMQConfig {
  url: string;
  emailQueue: string;
  failedQueue: string;
  exchangeName: string;
}

export interface UserPreference {
  email: boolean;
  push: boolean;
}

export interface RenderTemplateRequest {
  user_id: string;
  template_code: string;
  variables: Record<string, string>;
  correlation_id: string;
  metadata?: Record<string, string>;
}

export interface RenderTemplateResponse {
  email: string;
  subject: string;
  body: string;
  user_preferences: UserPreference;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}
