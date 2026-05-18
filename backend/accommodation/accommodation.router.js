import express from 'express';
import { listAction } from './accommodation.controller.js';

export const accommodationRouter = express.Router();

accommodationRouter.get('/', listAction);
