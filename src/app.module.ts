import { Module } from '@nestjs/common';
import { ConfigurationModule } from './config/configuration.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from "./auth/auth.module";
import { GroupModule } from "./group/group.module";
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
	imports: [
		ConfigurationModule,
		AuthModule,
		GroupModule,
		ServeStaticModule.forRoot({
		rootPath: join(__dirname, '..', 'public'),
		}),
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule { };
