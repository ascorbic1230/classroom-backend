import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
	constructor(private mailerService: MailerService) { }

	async sendUserConfirmation(user, token: string) {
		const url = `http://localhost:3000/auth/confirm?token=${token}`;

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

	async sendInviteEmail(emailToInvite: string, url: string, groupName: string, inviter: any) {
		await this.mailerService.sendMail({
			to: emailToInvite,
			subject: `You have been invited to join ${groupName} group`,
			template: './invite',
			context: {
				emailToInvite,
				url,
				groupName,
				inviterName: inviter.name,
				inviterEmail: inviter.email
			},
		});
	}
}