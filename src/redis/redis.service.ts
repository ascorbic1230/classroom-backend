import {
	Injectable,
	Logger,
	OnApplicationBootstrap,
	OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as redis from 'redis';

@Injectable()
export class RedisService
	implements OnApplicationShutdown, OnApplicationBootstrap {
	private client: any;

	private readonly logger = new Logger(RedisService.name);

	constructor(private readonly configService: ConfigService) { }

	async onApplicationBootstrap() {
		await this.connect();
	}

	async onApplicationShutdown() {
		await this.disconnect();
	}

	async connect() {
		const host = this.configService.get('REDIS_HOST');
		const port = this.configService.get('REDIS_PORT');
		const username = this.configService.get('REDIS_USERNAME');
		const password = this.configService.get('REDIS_PASSWORD');
		const client = redis.createClient({
			url: `redis://${username}:${password}@${host}:${port}`,
			socket: {
				tls: true
			},
		});

		client.connect();

		client.on('connect', () => {
			this.logger.log('Redis is connecting');
		});

		client.on('ready', () => {
			this.logger.log('Redis is ready');
		});

		client.on('error', (error) => {
			this.logger.error(error.message);
		});

		this.client = client;
	}

	async disconnect() {
		if (this.client && this.client.connected) {
			await this.client.quit();
		}
	}

	getAsync(key: string) {
		return this.client.get(key);
	}

	setAsync(key: string, value: unknown) {
		console.log('this.client', this.client)
		return this.client.set(key, value)
	}
}