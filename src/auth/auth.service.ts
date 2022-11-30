import {
	BadRequestException,
	Injectable,
	Logger,
} from '@nestjs/common';
import { UserService } from "../user/user.service";
import { hashPassword, validatePassword } from "../utils";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import { MailService } from "../mail/mail.service";
import { LoginDto } from "./dtos/auth.dto";

@Injectable()
export class AuthService {
	private logger = new Logger(AuthService.name);
	private googleClient: OAuth2Client;

	constructor(
		private readonly userService: UserService,
		private readonly configService: ConfigService,
		private readonly mailService: MailService
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

		//TODO: uncomment this when app is ready for production
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
		const confirmationToken = this.userService.generateJWTAsVerificationCode(newUser);
		await this.mailService.sendUserConfirmation(newUser, confirmationToken);
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

	async confirmAccount(token) {
		const user = await this.userService.verifyEmail(token);
		return user;
	}
}
