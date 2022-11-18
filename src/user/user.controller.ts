import { JwtAuthGuard } from "@/guards/jwt.guard";
import { Query, Controller, Get, UseGuards, Post, Req, Body, Put } from '@nestjs/common';
import { UserService } from "./user.service";
@Controller('user')
export class UserController {
	constructor(private readonly userService: UserService) { }

	//Admin Route
	@Get()
	@UseGuards(JwtAuthGuard)
	async getUser(@Query() query: any) {
		const user = await this.userService.findAll(query);
		return {
			statusCode: 200,
			data: user,
			message: 'Get all users successfully'
		};
	}

	@Get('me')
	@UseGuards(JwtAuthGuard)
	async getInfoAboutMe(@Req() req) {
		const user = await this.userService.findById(req.user._id);
		return {
			statusCode: 200,
			data: user,
			message: 'Get user\'s info successfully'
		};
	}

	@Put('me')
	@UseGuards(JwtAuthGuard)
	updateUser(@Req() req, @Body() body: any) {
		return this.userService.update(req.user._id, body);
	}

	@Get(':id')
	@UseGuards(JwtAuthGuard)
	async getUserById(@Req() req) {
		const user = await this.userService.findById(req.params.id);
		return {
			statusCode: 200,
			data: user,
			message: 'Get user\'s info successfully'
		};
	}
}
