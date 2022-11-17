import { JwtAuthGuard } from "@/guards/jwt.guard";
import { Query, Controller, Get, UseGuards, Post, Req, Body, Put, HttpStatus, HttpException } from '@nestjs/common';
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
	async getMyGroup(@Req() req) {
		const groups = await this.groupService.findMyGroup(req.user._id);
		return {
			statusCode: HttpStatus.OK,
			data: groups,
			message: 'Get my group successfully',
		}
	}

	@Get('my-created-group')
	@UseGuards(JwtAuthGuard)
	async getMyCreatedGroup(@Req() req) {
		const groups = await this.groupService.findMyCreatedGroup(req.user._id);
		return {
			statusCode: HttpStatus.OK,
			data: groups,
			message: 'Get my created group successfully',
		}
	}

	//Admin Route
	@Get(':id')
	@UseGuards(JwtAuthGuard)
	async getGroupById(@Req() req) {
		const group = await this.groupService.findById(req.params.id);
		if (!group) throw new HttpException('Group not found', HttpStatus.NOT_FOUND);
		return {
			statusCode: HttpStatus.OK,
			data: group,
			message: 'Find group successfully',
		}
	}

	@Post()
	@UseGuards(JwtAuthGuard)
	async createGroup(@Req() req, @Body() body: any) {
		const group = await this.groupService.create(body, req.user);
		return {
			statusCode: HttpStatus.OK,
			data: group,
			message: 'Create group successfully',
		}
	}

	@Put()
	@UseGuards(JwtAuthGuard)
	updateGroup(@Req() req, @Body() body: any) {
		const group = this.groupService.update(req.user._id, body);
		return {
			statusCode: HttpStatus.OK,
			data: group,
			message: 'Update group successfully',
		}
	}

	@Get(':id/get-invite-link')
	@UseGuards(JwtAuthGuard)
	async getInviteLink(@Req() req) {
		const inviteLink = await this.groupService.getInviteLink(req.user._id, req.params.id);
		return {
			statusCode: HttpStatus.OK,
			data: inviteLink,
			message: 'Get invite link successfully',
		}
	}

	@Get(':id/join')
	@UseGuards(JwtAuthGuard)
	async joinGroup(@Req() req) {
		const result = await this.groupService.joinGroup(req.user._id, req.params.id);
		return {
			statusCode: HttpStatus.OK,
			data: result,
			message: 'Join group successfully'
		}
	}
}
