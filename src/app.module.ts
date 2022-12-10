import { Module } from '@nestjs/common';
import { ConfigurationModule } from './config/configuration.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from "./auth/auth.module";
import { GroupModule } from "./group/group.module";
import { PresentationModule } from "./presentation/presentation.module";
import { SlideModule } from "./slide/slide.module";

@Module({
	imports: [
		ConfigurationModule,
		AuthModule,
		GroupModule,
		SlideModule,
		PresentationModule
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule { };
