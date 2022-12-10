import { JwtAuthGuard } from "../guards/jwt.guard";
import { Query, Param, Controller, Get, UseGuards, Post, Req, Body, Put, HttpStatus, HttpException, Delete } from '@nestjs/common';
import { SlideService } from "./slide.service";
import { CreateSlideDto } from "./dtos/create-slide-dto";
import { UpdateSlideDto } from "./dtos/update-slide-dto";
@Controller('slide')
export class SlideController {
	constructor(private readonly slideService: SlideService) { }

	//Admin Route
	@Get()
	@UseGuards(JwtAuthGuard)
	getSlide(@Query() query: any) {
		return this.slideService.findAll(query);
	}

	//Admin Route
	@Get(':id')
	@UseGuards(JwtAuthGuard)
	async getSlideById(@Req() req) {
		const result = await this.slideService.findById(req.params.id);
		if (!result) throw new HttpException('Slide not found', HttpStatus.NOT_FOUND);
		return {
			statusCode: HttpStatus.OK,
			data: result,
			message: 'Find slide successfully',
		}
	}

	@Post()
	@UseGuards(JwtAuthGuard)
	async createSlide(@Req() req, @Body() body: CreateSlideDto) {
		const result = await this.slideService.create(body, req.user._id);
		return {
			statusCode: HttpStatus.OK,
			data: result,
			message: 'Create slide successfully',
		}
	}

	@Put(':id')
	@UseGuards(JwtAuthGuard)
	async updateSlide(@Req() req, @Body() body: any) {
		const result = await this.slideService.update(req.params.id, body, req.user._id);
		return {
			statusCode: HttpStatus.OK,
			data: result,
			message: 'Update slide successfully',
		}
	}

	//delete slide
	@Delete(':id')
	@UseGuards(JwtAuthGuard)
	async deleteSlide(@Req() req) {
		await this.slideService.delete(req.params.id, req.user._id);
		return {
			statusCode: HttpStatus.OK,
			// data: slide,
			message: 'Delete slide successfully',
		}
	}
}
