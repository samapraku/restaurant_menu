let config = {};
config.db = {};

config.db.uri = 'PASTE MONGOD CONNECTION STRING HERE';
config.db.name = 'webtech_project';
config.db.options =  {
    reconnectTries: Number.MAX_VALUE,
    poolSize: 10
  };

module.exports = config;