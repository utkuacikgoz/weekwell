import { serve } from '@hono/node-server';
import { createApp } from './app';
import { loadConfig } from './config';
import { Db } from './db';

const config = loadConfig();
const app = createApp({ config, db: new Db(config.databasePath) });
serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, (info) => {
  console.log(JSON.stringify({ at: new Date().toISOString(), level: 'info', msg: 'weekwell api listening', port: info.port, priceSource: config.priceSource, storeMode: config.storeMode }));
});
