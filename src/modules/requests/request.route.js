import express from 'express';
import { saveRequest, getRequest } from './request.controller.js';

const router = express.Router();

router.post('/request', saveRequest);

router.get('/requests/:id', getRequest);

export default router; 