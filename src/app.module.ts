import { Module } from '@nestjs/common';
import { ConfigurationModule } from '@/config/configuration.module';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from "@/auth/auth.module";

@Module({
	imports: [
		ConfigurationModule,
		AuthModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule { };
