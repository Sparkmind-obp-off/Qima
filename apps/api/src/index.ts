import { createServer } from 'node:http';
import { loadQimaConfig } from '@qima/config';
import { success } from '@qima/shared';

const config = loadQimaConfig();

export const apiBootstrap = success({
  service: 'qima-api',
  status: 'ready',
  environment: config.appEnv,
});

if (process.env.QIMA_START_SERVER === 'true') {
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify(apiBootstrap));
  });

  server.listen(3001, () => {
    console.log('QIMA API bootstrap listening on http://localhost:3001');
  });
}
