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
			template: './confirmation', // `.hbs` extension is appended automatically
			context: { // ✏️ filling curly brackets with content
				email: user.email,
				url: url,
			},
		});
	}
}