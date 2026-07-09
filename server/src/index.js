import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Configs & Middlewares
import { connectDB } from './config/db.js';
import router from './routes/api.js';
import { errorHandler } from './middlewares/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Resolve __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Created uploads folder at: ${uploadDir}`);
}

// Connect Database
connectDB();

// Security & Logging Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // allow images to be fetched from client
}));
app.use(cors({
  origin: '*', // open or configure process.env.CLIENT_URL
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static route to uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'Seyon Microfinance Management Backend' });
});

// Bind APIs
app.use('/api', router);

// Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Seyon Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
