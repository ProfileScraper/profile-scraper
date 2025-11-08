import * as http from 'http';
import { URL } from 'url';

export class OAuthCallbackServer {
  private server: http.Server | null = null;
  private port = 3000;

  /**
   * Start the local server to handle OAuth callback
   */
  start(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stop();
        reject(new Error('OAuth timeout - no callback received'));
      }, 5 * 60 * 1000); // 5 minute timeout

      this.server = http.createServer((req, res) => {
        if (!req.url) {
          res.writeHead(400);
          res.end('Bad Request');
          return;
        }

        const url = new URL(req.url, `http://localhost:${this.port}`);

        if (url.pathname === '/oauth/callback') {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Authentication Failed</title>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
                    .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #dc3545; margin: 0 0 20px 0; }
                    p { color: #666; margin: 0 0 10px 0; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>❌ Authentication Failed</h1>
                    <p>Error: ${error}</p>
                    <p>You can close this window and try again.</p>
                  </div>
                </body>
              </html>
            `);
            clearTimeout(timeout);
            this.stop();
            reject(new Error(error));
            return;
          }

          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Authentication Successful</title>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
                    .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #28a745; margin: 0 0 20px 0; }
                    p { color: #666; margin: 0; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>✓ Authentication Successful</h1>
                    <p>You can close this window and return to ProfileScraper.</p>
                  </div>
                </body>
              </html>
            `);
            clearTimeout(timeout);
            this.stop();
            resolve(code);
            return;
          }

          res.writeHead(400);
          res.end('Missing authorization code');
          return;
        }

        res.writeHead(404);
        res.end('Not Found');
      });

      this.server.listen(this.port, () => {
        console.log(`[OAuth] Callback server listening on http://localhost:${this.port}`);
      });

      this.server.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Stop the server
   */
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('[OAuth] Callback server stopped');
    }
  }
}
