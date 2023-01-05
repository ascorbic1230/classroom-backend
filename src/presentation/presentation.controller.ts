import { JwtAuthGuard } from "../guards/jwt.guard";
import { Query, Param, Controller, Get, UseGuards, Post, Req, Body, Put, HttpStatus, HttpException, Delete } from '@nestjs/common';
import { PresentationService } from "./presentation.service";
import { PresentationDto } from "./dtos/presentation-dto";
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

	@Get('get-submit-result/:id')
	@UseGuards(JwtAuthGuard)
	async getSubmitResult(@Req() req) {
		const result = await this.presentationService.getSubmitResult(req.params.id, req.user._id);
		return {
			statusCode: HttpStatus.OK,
			data: result,
			message: `Get submit result of room ${req.params.id} successfully`,
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
}
