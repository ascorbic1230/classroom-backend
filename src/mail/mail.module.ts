import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global() // 👈 global module
@Module({
	imports: [
		MailerModule.forRootAsync({
			// imports: [ConfigModule], // import module if not enabled globally
			useFactory: async () => ({
				transport: {
					host: 'smtp.mail.yahoo.com',
					port: 465,
					secure: true,
					auth: {
						user: 'black_knight_kute@yahoo.com',
						pass: 'lnqykezmmxouurkj',
					},
				},
				defaults: {
					from: '"No Reply" <black_knight_kute@yahoo.com>',
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