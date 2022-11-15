import { JwtAuthGuard } from "@/guards/jwt.guard";
import { Query, Controller, Get, UseGuards, Post, Req, Body, Put } from '@nestjs/common';
import { GroupService } from "./group.service";
@Controller('group')
export class GroupController {
	constructor(private readonly groupService: GroupService) { }

	@Get()
	@UseGuards(JwtAuthGuard)
	getGroup(@Query() query: any) {
		return this.groupService.findAll(query);
	}

	@Post()
	@UseGuards(JwtAuthGuard)
	createGroup(@Req() req, @Body() body: any) {
		return this.groupService.create(body, req.user);
	}

	@Put()
	@UseGuards(JwtAuthGuard)
	updateGroup(@Req() req, @Body() body: any) {
		return this.groupService.update(req.user._id, body);
	}
}
