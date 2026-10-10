import { handleRequest } from './router';
import { Env } from './systems/items/routes';

export default {
  async fetch(request: Request, env: Env, ctx?: any): Promise<Response> {
    return handleRequest(request, env);
  }
};
