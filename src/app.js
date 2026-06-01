import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import routes from './routes.js';
import { startWorker } from './worker/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './config/logger.js';

const app = express();

app.use(express.json());

app.use(helmet());
app.use(compression()); 

routes(app);
logger();

app.use(errorHandler);

startWorker();

export default app;