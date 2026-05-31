import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import routes from './routes.js';
import { startWorker } from './worker/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use(helmet());
app.use(compression()); 

routes(app);

app.use(errorHandler);

startWorker();

export default app;