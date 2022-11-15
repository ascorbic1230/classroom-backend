import { JwtAuthGuard } from "@/guards/jwt.guard";
import { Query, Controller, Get, UseGuards } from '@nestjs/common';
import { GroupService } from "./group.service";
@Controller('group')
export class GroupController {
	constructor(private readonly groupService: GroupService) { }

	@Get()
	@UseGuards(JwtAuthGuard)
	getGroup(@Query() query: any) {
		return this.groupService.findAll(query);
	}
}
