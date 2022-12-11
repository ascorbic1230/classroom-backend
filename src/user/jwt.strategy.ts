import { Injectable } from '@nestjs/common';
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private userService: UserService, private configServices: ConfigService) {
		super({
			secretOrKey: configServices.get('JWT_SECRET'),
			jwtFromRequest: ExtractJwt.fromExtractors([JwtStrategy.extractJWT, ExtractJwt.fromAuthHeaderAsBearerToken()])
		});
	}

	async validate(payload: any) {
		const { email } = payload;
		const user = await this.userService.findByEmail(email);
		return { _id: user?._id.toString(), email: user?.email, name: user?.name };
	}

	private static extractJWT(req: any): string | null {
		if (req.cookies && 'token' in req.cookies && req.cookies.token.length > 0) {
			return req.cookies.token;
		}
		return null;
	}
}