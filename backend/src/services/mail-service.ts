export interface PasswordResetMail {
  recipient: string;
  fullName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface MailService {
  sendPasswordReset(message: PasswordResetMail): Promise<void>;
}

/**
 * Adapter phát triển. Production phải thay bằng nhà cung cấp email thật và
 * không ghi token vào log tập trung.
 */
export class DevelopmentMailService implements MailService {
  async sendPasswordReset(message: PasswordResetMail): Promise<void> {
    console.info(`[DEV MAIL] Reset password cho ${message.recipient}: ${message.resetUrl}`);
  }
}

