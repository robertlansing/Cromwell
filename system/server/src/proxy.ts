import { getLogger, readCMSConfigSync } from '@cromwell/core-backend';
import http from 'http';
import httpProxy from 'http-proxy';

import { loadEnv } from './helpers/loadEnv';
import { getServerPort, launch, serverAliveWatcher } from './helpers/serverManager';

require('dotenv').config();
const logger = getLogger();


async function main(): Promise<void> {
    loadEnv();
    const config = readCMSConfigSync();
    const port = config.apiPort ?? 4016;

    // Start a proxy at the server port. Actual server will be laucnhed at random port.
    // This way we can dynamically spawn new server instances and switch between them via proxy
    // with no downtime. Why do we need this? For example, when a plugin installed, server has to restart
    // to apply plugin's backend.
    const proxy = await httpProxy.createProxyServer();
    proxy.on('error', function (err) {
        logger.error(err);
    });

    const server = http.createServer((req, res) => {
        const serverPort = getServerPort();
        if (serverPort) {
            proxy.web(req, res, {
                target: `http://localhost:${serverPort}`
            });
        } else {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Proxy: Server is down');
        }
    });
    server.on("error", err => logger.log(err));

    await server.listen(port);
    await launch();

    serverAliveWatcher();
}

main();