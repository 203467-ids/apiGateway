import express from 'express';
import logger from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import httpProxy from 'express-http-proxy';
import bodyParser from 'body-parser';
import { jsonConfig } from './config/server.config';

(async () => {
  try {
    const {
      nameApplication,
      hostApplication,
      config,
      security,
      services,
    } = await jsonConfig();

    const app = express();

    if (config.enabledMorgan) {
      app.use(logger('dev'));
    }

    if (security.enabledHelmet) {
      app.use(helmet());
    }

    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Configurar body-parser para procesar todas las solicitudes
    app.use(bodyParser.json());

    app.get('/', (_, res) => {
      return res.json({ message: 'Running application' });
    });

    // Configurar express-http-proxy para redirigir todas las solicitudes
    services.forEach(({ nameRoute, url }) => {
      app.use(`/${nameRoute}`, (req, res, next) => {
        // Deshabilitar el análisis del cuerpo para solicitudes de carga de imágenes
        if (req.headers['content-type'] && req.headers['content-type'].startsWith('multipart/form-data')) {
          return httpProxy(url, {
            parseReqBody: false,
            timeout: 5000,
          })(req, res, next);
        }

        // Permitir el análisis del cuerpo para otras solicitudes
        return httpProxy(url, {
          parseReqBody: true,
          timeout: 5000,
        })(req, res, next);
      });
    });

    app.listen(config.port, () => {
      console.log(
        `Application ${nameApplication} is running on host ${hostApplication} on port ${config.port}`,
      );
    });
  } catch (error) {
    console.log(error.message);
    process.exit();
  }
})();
