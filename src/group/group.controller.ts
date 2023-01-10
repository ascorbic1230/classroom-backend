import { JwtAuthGuard } from "../guards/jwt.guard";
import { Query, Param, Controller, Get, UseGuards, Post, Req, Body, Put, HttpStatus, HttpException, Delete } from '@nestjs/common';
import { AssignRoleDto } from "./dtos/user-and-role.dto";
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

	@Get(':id/active-presentation')
	@UseGuards(JwtAuthGuard)
	async getActivePresentation(@Req() req) {
		const activePresentation = await this.groupService.findActivePresentation(req.params.id);
		return {
			statusCode: HttpStatus.OK,
			data: activePresentation,
			message: 'Get active presentation successfully',
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

	//invite user to group via email
	@Post(':id/invite-user-by-email')
	@UseGuards(JwtAuthGuard)
	async inviteUser(@Req() req, @Body('email') email: string) {
		const group = await this.groupService.inviteUserViaEmail(req.user, req.params.id, email);
		return {
			statusCode: HttpStatus.OK,
			data: group,
			message: 'Invite user via email successfully',
		}
	}

	@Get('/invite/:token')
	@UseGuards(JwtAuthGuard)
	async joinGroupByInviteLink(@Req() req, @Param('token') token: string) {
		const result = await this.groupService.joinGroupByInviteLink(req.user, token);
		return {
			statusCode: HttpStatus.OK,
			data: result,
			message: 'Join group successfully'
		}
	}

	@Get(':id/leave')
	@UseGuards(JwtAuthGuard)
	async leaveGroup(@Req() req) {
		const result = await this.groupService.leaveGroup(req.user._id, req.params.id);
		return {
			statusCode: HttpStatus.OK,
			// data: result,
			message: 'Leave group successfully'
		}
	}

	//kick user out of group
	@Get(':id/kick')
	@UseGuards(JwtAuthGuard)
	async kickUser(@Req() req, @Query('userId') userIdToKick: string) {
		const result = await this.groupService.kickUser(req.user._id, req.params.id, userIdToKick);
		return {
			statusCode: HttpStatus.OK,
			message: 'Kick user successfully'
		}
	}

	//delete group
	@Delete(':id')
	@UseGuards(JwtAuthGuard)
	async deleteGroup(@Req() req) {
		const result = await this.groupService.deleteGroup(req.user._id, req.params.id);
		return {
			statusCode: HttpStatus.OK,
			message: 'Delete group successfully'
		}
	}

	//assign role to user in group
	@Post(':id/assign-role')
	@UseGuards(JwtAuthGuard)
	async assignRole(@Req() req, @Body() userToUpdated: AssignRoleDto) {
		const result = await this.groupService.assignRole(req.user._id, req.params.id, userToUpdated);
		return {
			statusCode: HttpStatus.OK,
			message: 'Assign role successfully'
		}
	}

}
