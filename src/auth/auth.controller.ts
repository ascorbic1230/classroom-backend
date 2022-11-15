import {
	Body,
	Controller,
	Get,
	Post,
	Query,
	Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('/auth')
export class AuthController {
	constructor(private authService: AuthService) { }

	@Post('/sign-in')
	async login(@Body() body, @Res() res) {
		const user = await this.authService.login(body);
		res.cookie('token', user.token);
		res.json({
			data: user,
			message: 'Login successfully',
		});
	}

	@Post('/sign-up')
	async signUp(@Body() body) {
		const user = await this.authService.signUp(body);
		return {
			data: user,
			message: 'Sign Up successfully',
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
		// return {
		// 	data: user,
		// 	message: 'Login successfully',
		// };
		res.json({
			data: user,
			message: 'Login successfully',
		});
	};
}
