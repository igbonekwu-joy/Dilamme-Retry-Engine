import express from 'express';
import { saveRequest, getRequest, getRequestsWithStatus } from './request.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

router.post('/request', asyncHandler(saveRequest));

router.get('/requests/:id', asyncHandler(getRequest));

router.get('/requests', asyncHandler(getRequestsWithStatus));

export default router; 