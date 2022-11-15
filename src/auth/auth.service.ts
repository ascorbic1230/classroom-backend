import {
	BadRequestException,
	Injectable,
	Logger,
	Req,
	Res,
} from '@nestjs/common';
import { UserService } from "@/user/user.service";
import { hashPassword, validatePassword } from "@/utils";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";

@Injectable()
export class AuthService {
	private logger = new Logger(AuthService.name);
	private googleClient: OAuth2Client;

	constructor(
		private userService: UserService,
		private readonly configService: ConfigService,
	) {
		this.googleClient = new OAuth2Client('854978946487-4ghr067l2tv525p5jjs4ol6gbhiv8gkg.apps.googleusercontent.com',
			'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',
			'http://localhost:3000/auth/google/callback');
	}


	async login(dto) {
		const user = await this.userService.findByEmail(dto.email);

		if (!user) {
			throw new BadRequestException('Invalid email');
		}

		if (!validatePassword(dto.password, user.password)) {
			throw new BadRequestException('Invalid password');
		}

		//generate jwt token
		const token = this.userService.generateJWT(user);


		return {
			id: user._id,
			email: user.email,
			token: token,
		};
	}

	async signUp(dto) {
		const user = await this.userService.findByEmail(dto.email);

		if (user) {
			throw new BadRequestException('Username already exists');
		}

		const newUser = await this.userService.create({
			email: dto.email,
			password: hashPassword(dto.password),
		});

		return {
			id: newUser._id,
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

		let user = await this.userService.findByEmail(email);

		if (!user) {
			user = await this.userService.create({
				email: email,
				password: hashPassword('123456'),
				isEmailVerified: true,
			}
			);
		}

		//generate jwt token
		const token = this.userService.generateJWT(user);

		return {
			id: user._id,
			email: user.email,
			token: token,
		};
	}
}
