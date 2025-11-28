'use strict';

const winston = require('winston');
const config = require('../config');

/**
 * Custom logger using Winston
 */
const logger = winston.createLogger({
    level: config.logging.level,
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ level, message, timestamp, stack }) => {
            if (stack) {
                return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
            }
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp, stack }) => {
                    if (stack) {
                        return `${timestamp} [${level}]: ${message}\n${stack}`;
                    }
                    return `${timestamp} [${level}]: ${message}`;
                })
            )
        })
    ]
});

module.exports = logger;
