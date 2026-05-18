import express from 'express';
import { listPoisAction } from './poi.controller.js';

export const poiRouter = express.Router();

poiRouter.get('/', listPoisAction);
