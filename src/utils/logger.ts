import winston from 'winston';

export function createLogger(verbose: boolean = false) {
	return winston.createLogger({
		level: verbose ? 'debug' : 'info',
		format: winston.format.combine(
			winston.format.colorize(),
			winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
			winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
		),
		transports: [new winston.transports.Console()]
	});
}

export const logger = createLogger();

export function updateLoggerLevel(verbose: boolean) {
	logger.level = verbose ? 'debug' : 'info';
}
