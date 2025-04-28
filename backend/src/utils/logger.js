const winston = require('winston');
const config = require('../config/config');

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(
        ({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`
      )
    ),
  }),
];

// In production, also log to a file
if (config.isProduction) {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  );
}

const logger = winston.createLogger({
  level: config.isProduction ? 'info' : 'debug',
  format,
  transports,
  exitOnError: false,
});

module.exports = logger; 