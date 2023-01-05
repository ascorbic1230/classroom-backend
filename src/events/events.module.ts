import { Module } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { GroupModule } from "src/group/group.module";
import { RedisModule } from "src/redis/redis.module";
import { PresentationModule } from "../presentation/presentation.module";
import { SlideModule } from "../slide/slide.module";
import { UserModule } from "../user/user.module";
import { EventsGateway } from './events.gateway';

@Module({
	imports: [SlideModule,
		UserModule,
		PresentationModule,
		GroupModule,
		RedisModule,
		JwtModule.registerAsync({
			useFactory: (configService: ConfigService) => ({
				secret: configService.get('JWT_SECRET'),
				signOptions: { expiresIn: '7d' },
			}),
			inject: [ConfigService],
		})
	],
	providers: [EventsGateway],
})
export class EventsModule { }
