import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import router from './routes';
import { attachUser } from './middleware/auth';
import { env } from './config/env';
import {
   errorHandler,
   jsonSyntaxErrorHandler,
   notFoundHandler,
} from './middleware/error-handler';

const app = express();

app.disable('x-powered-by'); // Remove fingerprinting header for security.

if (env.trustProxy) {
   app.set('trust proxy', 1); // Ensure secure cookies work behind reverse proxies.
}

app.use((_, res, next) => {
   // Harden common security headers without requiring extra dependencies.
   res.setHeader('X-Content-Type-Options', 'nosniff');
   res.setHeader('X-Frame-Options', 'DENY');
   res.setHeader('Referrer-Policy', 'no-referrer');
   res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
   res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
   next();
});

app.use(
   cors({
      origin: env.corsOrigins,
      credentials: true,
      maxAge: 60 * 60, // Cache CORS preflight for one hour.
   })
);

app.use(cookieParser());
app.use(
   express.json({
      limit: env.requestBodyLimit,
   })
);
app.use(
   express.urlencoded({
      extended: false,
      limit: env.requestBodyLimit,
   })
);
app.use(attachUser);
app.use(router);
app.use(notFoundHandler);
app.use(jsonSyntaxErrorHandler);
app.use(errorHandler);

const server = app.listen(env.port, () => {
   console.log(`Server is running on http://localhost:${env.port}`);
});

let shuttingDown = false;

function terminate(signal: NodeJS.Signals) {
   if (shuttingDown) {
      return;
   }

   shuttingDown = true;
   console.log(`Received ${signal}. Gracefully shutting down.`);
   server.close((error) => {
      if (error) {
         console.error('Failed to close HTTP server gracefully', error);
         process.exit(1);
         return;
      }

      process.exit(0);
   });
}

process.on('SIGINT', terminate);
process.on('SIGTERM', terminate);

process.on('unhandledRejection', (reason) => {
   console.error('Unhandled promise rejection', reason);
});
