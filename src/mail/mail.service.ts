import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
	constructor(private mailerService: MailerService, private configService: ConfigService) { }

	async sendUserConfirmation(user, token: string) {
		const url = `${this.configService.get('BASE_URL')}/auth/confirm?token=${token}`;

		await this.mailerService.sendMail({
			to: user.email,
			subject: 'Confirm your email at TAT-Classroom',
			template: './confirmation',
			context: {
				email: user.email,
				url: url,
			},
		});
	}

	async sendInviteEmail(
		emailToInvite: string,
		url: string,
		groupName: string,
		inviter: any,
	) {
		await this.mailerService.sendMail({
			to: emailToInvite,
			subject: `You have been invited to join ${groupName} group`,
			template: './invite-to-group',
			context: {
				emailToInvite,
				url,
				groupName,
				inviterName: inviter.name,
				inviterEmail: inviter.email,
			},
		});
	}

	async sendResetPassword(email: string, token: string) {
		const url = `${this.configService.get(
			'FRONTEND_URL',
		)}/renew-password?token=${token}`;

		await this.mailerService.sendMail({
			to: email,
			subject: 'Reset your password at TAT-Classroom',
			template: './reset-password',
			context: {
				email,
				url,
			},
		});
	}
}
