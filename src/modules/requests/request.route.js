import express from 'express';
import { saveRequest, getRequest, getRequestsWithStatus } from './request.controller.js';

const router = express.Router();

router.post('/request', saveRequest);

router.get('/requests/:id', getRequest);

router.get('/requests', getRequestsWithStatus);

export default router; 