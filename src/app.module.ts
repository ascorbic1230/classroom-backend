import { Module } from '@nestjs/common';
import { ConfigurationModule } from './config/configuration.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from "./auth/auth.module";
import { GroupModule } from "./group/group.module";
import { PresentationModule } from "./presentation/presentation.module";
import { SlideModule } from "./slide/slide.module";
import { EventsModule } from "./events/events.module";
import { RedisModule } from "./redis/redis.module";

@Module({
	imports: [
		ConfigurationModule,
		AuthModule,
		GroupModule,
		RedisModule,
		SlideModule,
		EventsModule,
		PresentationModule
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule { };
