import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import router from './routes';
import { attachUser } from './middleware/auth';

dotenv.config();

const app = express();

const allowedOrigin = process.env.CLIENT_ORIGIN ?? true;

app.use(
   cors({
      origin: allowedOrigin,
      credentials: true,
   })
);
app.use(cookieParser());
app.use(express.json());
app.use(attachUser);
app.use(router);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
   console.log(`Server is running on http://localhost:${PORT}`);
});
