import { Module } from '@nestjs/common';
import { ConfigurationModule } from 'src/config/configuration.module';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { AuthModule } from "src/auth/auth.module";
import { GroupModule } from "./group/group.module";

@Module({
	imports: [
		ConfigurationModule,
		AuthModule,
		GroupModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule { };
