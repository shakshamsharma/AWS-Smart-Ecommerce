const winston = require('winston');
const path    = require('path');
const fs      = require('fs');

const logDir = '/var/log/ecommerce';
if (process.env.NODE_ENV === 'production') {
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    ...(process.env.NODE_ENV === 'production'
      ? [new winston.transports.File({ filename: path.join(logDir, 'app.log'), maxsize: 10485760, maxFiles: 5 })]
      : []),
  ],
});

module.exports = logger;
