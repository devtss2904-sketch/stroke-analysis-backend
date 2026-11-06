const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const envConfig = require('./config/env.config');
const httpLoggerMiddleware = require('./middleware/logger.middleware');
const notFoundMiddleware = require('./middleware/notFound.middleware');
const errorMiddleware = require('./middleware/error.middleware');
const apiRoutes = require('./routes');
const ApiResponse = require('./utils/apiResponse');

const app = express();

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: envConfig.corsOrigin,
    credentials: true,
  })
);

// HTTP request logger
app.use(httpLoggerMiddleware);

// Body parser middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root route
app.get('/', (req, res) => {
  return ApiResponse.success(res, 'Backend API is running', {
    service: 'Backend API Service',
    version: '1.0.0',
    environment: envConfig.nodeEnv,
  });
});

// Mount API v1 routes
app.use('/api/v1', apiRoutes);

// Catch 404 routes
app.use(notFoundMiddleware);

// Global centralized error handler
app.use(errorMiddleware);

module.exports = app;

