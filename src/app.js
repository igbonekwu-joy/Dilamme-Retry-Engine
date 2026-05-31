import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import routes from './routes.js';
import { startWorker } from './worker/index.js';

const app = express();
routes(app);

app.use(cors());
app.use(express.json());

app.use(helmet());
app.use(compression()); 

startWorker();

export default app;