import { loadQimaConfig } from '@qima/config';
import { success } from '@qima/shared';

const config = loadQimaConfig();

export const webBootstrap = success({
  service: 'qima-web',
  status: 'ready',
  environment: config.appEnv,
  apiUrl: config.apiUrl,
});

if (process.env.QIMA_START_SERVER === 'true') {
  console.log(`QIMA Web bootstrap ready for ${config.webUrl}`);
}
