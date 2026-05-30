import express from 'express';
import requestRoutes from './modules/requests/request.route.js';

export default function routes(app) {
    app.use(express.json());
    app.use(express.urlencoded({extended: true})); 

    app.use('/request', requestRoutes);
}