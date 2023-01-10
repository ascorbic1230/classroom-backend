import {
	Body,
	Controller,
	Get,
	Post,
	Query,
	Res,
} from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { AuthService } from './auth.service';
import { LoginDto } from "./dtos/auth.dto";

@Controller('/auth')
export class AuthController {
	constructor(private authService: AuthService, private configService: ConfigService) { }

	@Post('/sign-in')
	async login(@Res() res, @Body() body: LoginDto) {
		const user = await this.authService.login(body);
		res.cookie('token', user.token);
		res.cookie('user', JSON.stringify(user.user));
		res.json({
			data: user,
			message: 'Login successfully',
		});
	}

	@Post('/sign-up')
	async signUp(@Body() body: LoginDto) {
		const user = await this.authService.signUp(body);
		return {
			data: user,
			message: 'Please check your email to confirm your account (Check spam folder too)',
		};
	}

	@Get('/google')
	async loginGoogle(@Res() res) {
		const url = await this.authService.getGoogleRedirectLink();
		return res.redirect(url);
	}

	@Get('/google/callback')
	async loginGoogleCallback(@Query('code') code, @Res() res) {
		const user = await this.authService.loginGoogle(code);
		res.cookie('token', user.token);
		res.cookie('user', JSON.stringify(user.user));
		const urlToRedirect = `${this.configService.get('FRONTEND_URL')}/login/google?token=${user.token}&user=${JSON.stringify(user.user)}`;
		return res.redirect(urlToRedirect);
	}

	@Get('/confirm')
	async confirmAccount(@Query('token') token, @Res() res) {
		const user = await this.authService.confirmAccount(token);
		return res.redirect(`${this.configService.get('FRONTEND_URL')}/login?email=${user.email}`);
	}

	@Post('/reset-password')
	async forgotPassword(@Body('email') email) {
		await this.authService.sendEmailToResetPassword(email);
		return {
			message:
				'Please check your email to reset your password (Check spam folder too)',
		};
	}

	@Post('/reset-password/confirm')
	async resetPassword(@Body('token') token, @Body('password') password) {
		const user = await this.authService.resetPassword(token, password);
		return {
			message: 'Reset password successfully',
			data: user,
		};
	}
}
