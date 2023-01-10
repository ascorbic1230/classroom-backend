import {
	BadRequestException,
	Injectable,
	Logger,
} from '@nestjs/common';
import { UserService } from "../user/user.service";
import { generateRandomString, hashPassword, validatePassword } from "../utils";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import { MailService } from "../mail/mail.service";
import { LoginDto } from "./dtos/auth.dto";
import { RedisService } from "src/redis/redis.service";

@Injectable()
export class AuthService {
	private logger = new Logger(AuthService.name);
	private googleClient: OAuth2Client;
	private prefixMailForgotCode = 'mail.forgot.code'
	private prefixMailForgotEmail = 'mail.forgot.email'
	private prefixMailActivationCode = 'mail.activation.code'
	private prefixMailActivationEmail = 'mail.activation.email'

	constructor(
		private readonly userService: UserService,
		private readonly configService: ConfigService,
		private readonly mailService: MailService,
		private readonly redisService: RedisService
	) {
		this.googleClient = new OAuth2Client('854978946487-4ghr067l2tv525p5jjs4ol6gbhiv8gkg.apps.googleusercontent.com',
			'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',
			`${this.configService.get('BASE_URL')}/auth/google/callback`);
	}


	async login(data: LoginDto) {
		const user = await this.userService.findByEmail(data.email);

		if (!user) {
			throw new BadRequestException('Invalid email');
		}

		if (!validatePassword(data.password, user.password)) {
			throw new BadRequestException('Invalid password');
		}

		if (!user.isEmailVerified) {
			throw new BadRequestException('Email is not verified');
		}

		//generate jwt token
		const token = this.userService.generateJWT(user);

		return {
			token: token,
			user: {
				id: user._id.toString(),
				email: user.email,
				name: user.name,
				isLoggedInWithGoogle: user.isLoggedInWithGoogle,
				avatarUrl: user.avatarUrl,
			}
		};
	}

	async signUp(data: LoginDto) {
		const user = await this.userService.findByEmail(data.email);

		if (user) {
			throw new BadRequestException('Email already exists');
		}

		const newUser = await this.userService.create({
			name: data.name,
			email: data.email,
			password: hashPassword(data.password),
		});
		// send email
		const mailActivationCode = generateRandomString();
		await this.redisService.setEx(`${this.prefixMailActivationCode}-${mailActivationCode}`, newUser.email);
		await this.redisService.setEx(`${this.prefixMailActivationEmail}-${newUser.email}`, mailActivationCode);
		await this.mailService.sendUserConfirmation(newUser, mailActivationCode);
		return {
			id: newUser._id,
			name: newUser.name,
			email: newUser.email
		};
	}

	async getGoogleRedirectLink() {
		const url = this.googleClient.generateAuthUrl({
			access_type: 'offline',
			scope: ['profile', 'email'],
			//let user select account
			prompt: 'select_account',
		});
		return url;
	};

	async loginGoogle(code) {
		const { tokens } = await this.googleClient.getToken(code);
		const ticket = await this.googleClient.verifyIdToken({
			idToken: tokens.id_token,
			audience: '854978946487-4ghr067l2tv525p5jjs4ol6gbhiv8gkg.apps.googleusercontent.com',
		});

		const payload = ticket.getPayload();
		const email = payload['email'];
		const name = payload['name'];

		let user = await this.userService.findByEmail(email);

		if (!user) {
			user = await this.userService.create({
				email: email,
				name: name,
				isLoggedInWithGoogle: true,
				password: hashPassword(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)),
				isEmailVerified: true,
			}
			);
		}

		//generate jwt token
		const token = this.userService.generateJWT(user);

		return {
			token: token,
			user: {
				id: user._id.toString(),
				email: user.email,
				name: user.name,
				isLoggedInWithGoogle: user.isLoggedInWithGoogle,
				avatarUrl: user.avatarUrl,
			}
		};
	}

	async confirmAccount(code: string) {
		const email = await this.redisService.get(`${this.prefixMailActivationCode}-${code}`);
		if (!email) {
			throw new BadRequestException('Invalid code');
		}
		const activeCode = await this.redisService.get(`${this.prefixMailActivationEmail}-${email}`);
		if (!activeCode) {
			throw new BadRequestException('Code expired');
		}
		const user = await this.userService.findByEmail(email);
		if (!user) {
			throw new BadRequestException('User not found');
		}
		user.isEmailVerified = true;
		await user.save();
		await this.redisService.del(`${this.prefixMailActivationCode}-${code}`);
		await this.redisService.del(`${this.prefixMailActivationEmail}-${email}`);
		return user;
	}

	async sendEmailToResetPassword(email: string) {
		const user = await this.userService.findByEmail(email);
		if (!user) {
			throw new BadRequestException('User not found');
		}
		const code = generateRandomString();
		await this.redisService.setEx(`${this.prefixMailForgotCode}-${code}`, email);
		await this.redisService.setEx(`${this.prefixMailForgotEmail}-${email}`, code);
		await this.mailService.sendResetPassword(email, code);
	}

	async resetPassword(code: string, newPassword: string) {
		const email = await this.redisService.get(`${this.prefixMailForgotCode}-${code}`);
		if (!email) {
			throw new BadRequestException('Invalid code');
		}
		const activeCode = await this.redisService.get(`${this.prefixMailForgotEmail}-${email}`);
		if (activeCode !== code) {
			throw new BadRequestException('Code expired');
		}
		await this.userService.resetPassword(email, newPassword);
		await this.redisService.del(`${this.prefixMailForgotCode}-${code}`);
		await this.redisService.del(`${this.prefixMailForgotEmail}-${email}`);
	}
}
