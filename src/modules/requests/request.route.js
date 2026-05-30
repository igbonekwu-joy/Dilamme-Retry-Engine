import express from 'express';
import { saveRequest } from './request.controller.js';

const router = express.Router();

router.post('/', saveRequest);

export default router; 