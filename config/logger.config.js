const envConfig = require('./env.config');

const morganFormat = envConfig.nodeEnv === 'production' 
  ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
  : ':method :url :status :response-time ms - :res[content-length]';

module.exports = {
  morganFormat,
};

