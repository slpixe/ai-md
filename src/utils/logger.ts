import winston from 'winston';

const ALL_LOG_LEVELS = ['error', 'warn', 'info', 'debug'];

function createConsoleTransport(verbose: boolean, allToStderr: boolean) {
  return new winston.transports.Console({
    level: verbose ? 'debug' : 'info',
    stderrLevels: allToStderr ? ALL_LOG_LEVELS : ['error'],
  });
}

export function createLogger(verbose: boolean = false, allToStderr: boolean = false) {
  return winston.createLogger({
    level: verbose ? 'debug' : 'info',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
    ),
    transports: [createConsoleTransport(verbose, allToStderr)]
  });
}

export const logger = createLogger();

export function updateLoggerLevel(verbose: boolean) {
  logger.level = verbose ? 'debug' : 'info';
  // Also update transport level to match
  logger.transports.forEach(transport => {
    transport.level = verbose ? 'debug' : 'info';
  });
}

export function configureLogger(verbose: boolean, allToStderr: boolean): void {
  logger.level = verbose ? 'debug' : 'info';
  logger.clear();
  logger.add(createConsoleTransport(verbose, allToStderr));
}
