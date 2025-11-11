import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { CircuitBreakerService } from 'src/circuit.breaker/circuit.breaker.service';
import { EmailPayload } from 'src/types';

@Injectable()
export class SendGridService {
  private readonly logger = new Logger(SendGridService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(
    private configService: ConfigService,
    private circuitBreaker: CircuitBreakerService,
  ) {
    const apiKey = this.configService.get<string>('sendgrid.apiKey')!;
    sgMail.setApiKey(apiKey);

    this.fromEmail = this.configService.get<string>('sendgrid.fromEmail')!;
    this.fromName = this.configService.get<string>('sendgrid.fromName')!;
  }

  async sendEmail(payload: EmailPayload, correlationId: string): Promise<void> {
    this.logger.log(`[${correlationId}] Sending email to ${payload.to}`);

    await this.circuitBreaker.executeWithCircuitBreaker(
      'sendgrid',
      async () => {
        const msg = {
          to: payload.to,
          from: {
            email: this.fromEmail,
            name: this.fromName,
          },
          subject: payload.subject,
          html: payload.html,
          text: payload.text || this.stripHtml(payload.html),
        };

        const response = await sgMail.send(msg);

        if (response[0].statusCode !== 202) {
          throw new Error(
            `SendGrid returned status: ${response[0].statusCode}`,
          );
        }

        this.logger.log(
          `[${correlationId}] Email sent successfully to ${payload.to}`,
        );
      },
    );
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
}
