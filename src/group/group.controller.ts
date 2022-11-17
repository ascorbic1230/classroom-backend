import { JwtAuthGuard } from "@/guards/jwt.guard";
import { Query, Controller, Get, UseGuards, Post, Req, Body, Put } from '@nestjs/common';
import { GroupService } from "./group.service";
@Controller('group')
export class GroupController {
	constructor(private readonly groupService: GroupService) { }

	//Admin Route
	@Get()
	@UseGuards(JwtAuthGuard)
	getGroup(@Query() query: any) {
		return this.groupService.findAll(query);
	}

	@Get('my-group')
	@UseGuards(JwtAuthGuard)
	getMyGroup(@Req() req) {
		return this.groupService.findMyGroup(req.user._id);
	}

	@Get('my-created-group')
	@UseGuards(JwtAuthGuard)
	getMyCreatedGroup(@Req() req) {
		return this.groupService.findMyCreatedGroup(req.user._id);
	}

	//Admin Route
	@Get(':id')
	@UseGuards(JwtAuthGuard)
	getGroupById(@Req() req) {
		return this.groupService.findById(req.params.id);
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

	@Get(':id/get-invite-link')
	@UseGuards(JwtAuthGuard)
	getInviteLink(@Req() req) {
		return this.groupService.getInviteLink(req.user._id, req.params.id);
	}

	@Get(':id/join')
	@UseGuards(JwtAuthGuard)
	joinGroup(@Req() req) {
		return this.groupService.joinGroup(req.user._id, req.params.id);
	}
}
