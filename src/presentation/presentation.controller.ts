import { JwtAuthGuard } from "../guards/jwt.guard";
import { Query, Param, Controller, Get, UseGuards, Post, Req, Body, Put, HttpStatus, HttpException, Delete, ValidationPipe, UsePipes } from '@nestjs/common';
import { PresentationService } from "./presentation.service";
import { PresentationDto } from "./dtos/presentation-dto";
import { GetChatDto } from "./dtos/get-chat-dto";
@Controller('presentation')
export class PresentationController {
	constructor(private readonly presentationService: PresentationService) { }

	//Admin Route
	@Get()
	@UseGuards(JwtAuthGuard)
	getPresentation(@Query() query: any) {
		return this.presentationService.findAll(query);
	}

	@Get('my-presentation')
	@UseGuards(JwtAuthGuard)
	async getMyPresentation(@Req() req) {
		const presentations = await this.presentationService.findMyPresentation(req.user._id);
		return {
			statusCode: HttpStatus.OK,
			data: presentations,
			message: 'Get my presentation successfully',
		}
	}

	@Get('check-active-group-presentation')
	@UseGuards(JwtAuthGuard)
	async checkActiveGroupPresentation(@Req() req) {
		const result = await this.presentationService.checkActiveGroupPresentation(req.user._id);
		return {
			statusCode: HttpStatus.OK,
			data: result,
			message: 'Get my active group presentation successfully',
		}
	}

	//Admin Route
	@Get(':id')
	@UseGuards(JwtAuthGuard)
	async getPresentationById(@Req() req) {
		const result = await this.presentationService.findById(req.params.id);
		if (!result) throw new HttpException('Presentation not found', HttpStatus.NOT_FOUND);
		return {
			statusCode: HttpStatus.OK,
			data: result,
			message: 'Find presentation successfully',
		}
	}

	@Post()
	@UseGuards(JwtAuthGuard)
	async createPresentation(@Req() req, @Body() body: PresentationDto) {
		const result = await this.presentationService.create(body, req.user._id);
		return {
			statusCode: HttpStatus.OK,
			data: result,
			message: 'Create presentation successfully',
		}
	}

	@Put(':id')
	@UseGuards(JwtAuthGuard)
	async updatePresentation(@Req() req, @Body() body: PresentationDto) {
		const result = await this.presentationService.update(req.params.id, body, req.user._id);
		return {
			statusCode: HttpStatus.OK,
			data: result,
			message: 'Update presentation successfully',
		}
	}

	@Put(':id/collaborator')
	@UseGuards(JwtAuthGuard)
	async addCollaborator(@Req() req, @Body() body: { email: string }) {
		const result = await this.presentationService.addCollaborator(req.params.id, body, req.user._id);
		return {
			statusCode: HttpStatus.OK,
			data: result,
			message: 'Add collaborator successfully',
		}
	}

	@Delete(':id/collaborator')
	@UseGuards(JwtAuthGuard)
	async removeCollaborator(@Req() req, @Body() body: { email: string }) {
		const result = await this.presentationService.removeCollaborator(req.params.id, body, req.user._id);
		return {
			statusCode: HttpStatus.OK,
			data: result,
			message: 'Remove collaborator successfully',
		}
	}

	//delete presentation
	@Delete(':id')
	@UseGuards(JwtAuthGuard)
	async deletePresentation(@Req() req) {
		await this.presentationService.delete(req.params.id, req.user._id);
		return {
			statusCode: HttpStatus.OK,
			message: 'Delete presentation successfully',
		}
	}

	//check if has permission to socket room
	@Get('get-socket-room/:id')
	@UseGuards(JwtAuthGuard)
	async getSocketRoom(@Req() req) {
		const result = await this.presentationService.getSocketRoom(req.params.id, req.user._id);
		return {
			statusCode: HttpStatus.OK,
			data: result,
			message: 'You can join this room',
		}
	}

	@Get('get-socket-room/:id/chat')
	@UseGuards(JwtAuthGuard)
	async getChats(@Req() req, @Query() query: GetChatDto) {
		const { data, meta } = await this.presentationService.getChats(req.params.id, req.user._id, query);
		return {
			statusCode: HttpStatus.OK,
			data,
			meta,
			message: 'Get chat successfully',
		}
	}

	@Get('get-socket-room/:id/question')
	@UseGuards(JwtAuthGuard)
	async getQuestions(@Req() req) {
		const result = await this.presentationService.getQuestions(req.params.id, req.user._id);
		return {
			statusCode: HttpStatus.OK,
			data: result,
			message: 'Get questions successfully',
		}
	}

	@Get('get-socket-room/:id/submit-result')
	@UseGuards(JwtAuthGuard)
	async getSubmitResult(@Req() req) {
		const result = await this.presentationService.getSubmitResult(req.params.id, req.user._id);
		return {
			statusCode: HttpStatus.OK,
			data: result,
			message: `Get submit result of room ${req.params.id} successfully`,
		}
	}
}
