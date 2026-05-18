import express from 'express';
import cors from 'cors';
import { accommodationRouter } from './accommodation/accommodation.router.js';
import { poiRouter } from './poi/poi.router.js';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());

app.get('/api/health', (_req, res) => {
	res.json({ ok: true, service: 'woubini-backend' });
});

app.use('/api/accommodations', accommodationRouter);
app.use('/api/attractions', poiRouter);

app.listen(PORT, () => {
	console.log(`Backend listening on http://localhost:${PORT}`);
});
