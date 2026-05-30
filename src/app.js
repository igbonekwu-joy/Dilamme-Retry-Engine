import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import routes from './routes.js';

const app = express();
routes(app);

app.use(cors());
app.use(express.json());

app.use(helmet());
app.use(compression()); 

export default app;