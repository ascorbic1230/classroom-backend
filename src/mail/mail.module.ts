import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
	imports: [
		MailerModule.forRootAsync({
			useFactory: async () => ({
				transport: {
					host: 'smtp.gmail.com',
					port: 465,
					secure: true,
					auth: {
						user: 'tat.classroom.22@gmail.com',
						pass: 'hkinbaeanjdoesdx',
					},
				},
				defaults: {
					from: '"No Reply" <tat.classroom.22@gmail.com>',
				},
				template: {
					dir: join(__dirname, 'templates'),
					adapter: new HandlebarsAdapter(),
					options: {
						strict: true,
					},
				},
			}),
			inject: [ConfigService],
		}),
	],
	providers: [MailService],
	exports: [MailService],
})
export class MailModule { }