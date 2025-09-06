const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver configuration for better module resolution
config.resolver.platforms = ['native', 'web', 'ios', 'android'];

// Improve transformer configuration
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Add server configuration for better tunnel stability
config.server = {
  port: 8081,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add CORS headers for better tunnel compatibility
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      return middleware(req, res, next);
    };
  },
};

module.exports = config;