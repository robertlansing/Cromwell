import { spawn } from 'child_process';
import yargs from 'yargs/yargs';

import { createTask } from './tasks/create';

export type TServiceNames = 'renderer' | 'r' | 'server' | 's' | 'adminPanel' | 'a' | 'nginx' | 'n';

let manager;
const getManager = () => {
  if (!manager) {
    try {
      manager = require('@cromwell/cms');
    } catch (error) {
      console.error(
        `Could not locate '@cromwell/cms' package. Make sure you run it a project with installed dependencies`,
        error,
      );
      return;
    }
  }
  return manager;
};

const args = yargs(process.argv.slice(2))
  // START
  .command<{
    service?: string;
    development?: boolean;
    detached?: boolean;
    port?: string;
    try?: boolean;
    init?: boolean;
  }>({
    command: 'start [options]',
    describe: 'starts CMS or a specified service',
    aliases: ['start', 's'],
    builder: (yargs) => {
      return yargs
        .option('service', {
          alias: 'sv',
          desc: 'Specify service to start: "server", "renderer", "adminPanel", "nginx',
          choices: ['server', 's', 'renderer', 'r', 'adminPanel', 'a', 'nginx', 'n'],
        })
        .option('development', {
          alias: 'dev',
          desc: 'Start service in development mode',
          type: 'boolean',
        })
        .option('detached', {
          alias: 'd',
          desc: 'Start service detached from terminal',
          type: 'boolean',
        })
        .option('port', {
          alias: 'p',
          desc: 'Port of a service',
          type: 'string',
        })
        .option('try', {
          desc: 'Stop after full start',
          type: 'boolean',
        })
        .option('init', {
          desc: 'Initialize database with test data.',
          type: 'boolean',
        });
    },
    handler: async (argv) => {
      const serviceToStart = argv.service as TServiceNames;
      const development = argv.development;
      const detached = argv.detached;
      const port = argv.port;
      const init = argv.init;

      if (detached) {
        let command = `npx --no-install crw s`;
        if (serviceToStart) command += ` --sv ${serviceToStart}`;
        if (development) command += ' --dev';
        if (port) command += ` --port ${port}`;
        if (init) command += ` --init`;

        if (serviceToStart) {
          const subprocess = spawn(command, {
            shell: true,
            detached: true,
            stdio: 'ignore',
          });
          subprocess.unref();
        } else {
          const server = spawn(command + ' --sv s', {
            shell: true,
            detached: true,
            stdio: 'ignore',
          });
          server.unref();

          const admin = spawn(command + ' --sv a', {
            shell: true,
            detached: true,
            stdio: 'ignore',
          });
          admin.unref();

          const renderer = spawn(command + ' --sv r', {
            shell: true,
            detached: true,
            stdio: 'ignore',
          });
          renderer.unref();
        }

        return;
      }

      const { startServiceByName, startSystem, closeServiceByName } = getManager();
      if (serviceToStart) {
        await startServiceByName({
          scriptName: development ? 'development' : 'production',
          serviceName: serviceToStart,
          port,
          init,
        });
        if (serviceToStart === 's' || serviceToStart === 'server') {
          process.title = '@cromwell/server';
        }
        if (serviceToStart === 'r' || serviceToStart === 'renderer') {
          process.title = '@cromwell/renderer';
        }
        if (serviceToStart === 'a' || serviceToStart === 'adminPanel') {
          process.title = '@cromwell/admin-panel';
        }
      } else {
        if (development) {
          await startSystem({
            scriptName: 'development',
            port,
            init,
          });
        } else {
          await startSystem({
            scriptName: 'production',
            port,
            init,
          });
        }
      }

      if (argv.try) {
        if (serviceToStart) {
          await closeServiceByName(serviceToStart);
          process.exit(0);
        } else {
          await closeServiceByName('server');
          await closeServiceByName('adminPanel');
          await closeServiceByName('renderer');
        }
      }
    },
  })
  // STOP SERVICE
  .command<{ service?: string; development?: boolean }>({
    command: 'stop [options]',
    describe: `Stops CMS or a specified service by it's saved PID`,
    aliases: ['stop', 'st'],
    builder: (yargs) => {
      return yargs.option('service', {
        alias: 'sv',
        desc: 'Specify service to stop: "server", "renderer", "adminPanel", "nginx',
        choices: ['server', 's', 'renderer', 'r', 'adminPanel', 'a', 'nginx', 'n'],
      });
    },
    handler: async (argv) => {
      const serviceToClose = argv.service as TServiceNames;
      const { closeServiceAndManagerByName, shutDownSystem } = getManager();

      if (serviceToClose) {
        await closeServiceAndManagerByName(serviceToClose);
      } else {
        await shutDownSystem();
      }
    },
  })
  // SERVICE STATUS
  .command<{ service?: string; development?: boolean }>({
    command: 'status',
    describe: `Shows status (active/inactive) of CMS services`,
    aliases: ['status'],
    handler: async () => {
      const { getServicesStatus } = getManager();
      await getServicesStatus();
    },
  })
  // BUILD
  .command<{ watch?: boolean; port?: string; admin?: boolean; force?: boolean }>({
    command: 'build [options]',
    describe: 'builds CMS module - theme or plugin',
    aliases: ['build', 'b'],
    builder: (yargs) => {
      return yargs
        .option('watch', {
          alias: 'w',
          desc: 'watch files and rebuild on change',
          type: 'boolean',
        })
        .option('port', {
          alias: 'p',
          desc: 'Port for Next.js server',
          type: 'string',
        });
    },
    handler: (argv) => {
      const { buildTask } = getManager();
      buildTask(argv.watch, argv.port);
    },
  })
  // CREATE
  .command<{ name?: string; type?: string; noInstall?: boolean }>({
    command: 'create <name> [options]',
    describe: 'creates new Cromwell project',
    aliases: ['create', 'c'],
    builder: (yargs) => {
      return yargs
        .option('type', {
          alias: 't',
          desc: 'type of project - default, plugin, theme',
          choices: ['theme', 't', 'plugin', 'p', 'default', 'd'],
        })
        .option('noInstall', {
          alias: 'noInstall',
          desc: 'do not run npm install',
          type: 'boolean',
        });
    },
    handler: (argv) => {
      createTask(argv.name, argv.noInstall, argv.type);
    },
  })
  // BUNDLE MODULES
  .command<{ remove?: boolean; development?: boolean; force?: boolean }>({
    command: 'bm [options]',
    describe: 'bundle frontend node_modules',
    aliases: ['bundle-modules', 'bm'],
    builder: (yargs) => {
      return yargs
        .option('remove', {
          alias: 'r',
          desc: 'Remove old bundles before',
          type: 'boolean',
        })
        .option('development', {
          alias: 'dev',
          desc: 'Bundle module in development mode',
          type: 'boolean',
        })
        .option('force', {
          alias: 'f',
          desc: 'Force bundle if found conflicts',
          type: 'boolean',
        });
    },
    handler: (argv) => {
      const { bundler } = require('@cromwell/utils/bundler/bundler');
      bundler({
        projectRootDir: process.cwd(),
        isProduction: !argv.development,
        rebundle: argv.remove,
        forceInstall: argv.force,
      });
    },
  })
  // DOWNLOAD
  .command({
    command: 'download',
    describe: 'download bundled frontend modules',
    aliases: ['download', 'd'],
    handler: (argv) => {
      const { downloader } = require('@cromwell/utils/build/downloader');
      downloader();
    },
  })
  // CLEAN
  .command({
    command: 'clean',
    describe: 'Dev tool. Supposed to be used in Cromwell monorepo. Removes all compiled and temp directories',
    aliases: ['clean'],
    handler: (argv) => {
      require('../src/utils/cleanup.js');
    },
  })
  .recommendCommands()
  .demandCommand(1, '')
  .help()
  .strict().argv;
