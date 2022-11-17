import { JwtAuthGuard } from "@/guards/jwt.guard";
import { Query, Controller, Get, UseGuards, Post, Req, Body, Put } from '@nestjs/common';
import { UserService } from "./user.service";
@Controller('user')
export class UserController {
	constructor(private readonly userService: UserService) { }

	//Admin Route
	@Get()
	@UseGuards(JwtAuthGuard)
	getUser(@Query() query: any) {
		return this.userService.findAll(query);
	}

	@Put()
	@UseGuards(JwtAuthGuard)
	updateUser(@Req() req, @Body() body: any) {
		return this.userService.update(req.user._id, body);
	}

	@Get('me')
	@UseGuards(JwtAuthGuard)
	getInfoAboutMe(@Req() req) {
		return this.userService.findById(req.user._id);
	}
}
