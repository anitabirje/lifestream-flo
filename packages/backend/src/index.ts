import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import authRoutes from './routes/auth';
import familyMembersRoutes from './routes/family-members';
import extracurricularActivitiesRoutes from './routes/extracurricular-activities';
import idealAllocationRoutes from './routes/ideal-allocation';
import eventsRoutes from './routes/events';
import dashboardRoutes from './routes/dashboard';
import thresholdsRoutes from './routes/thresholds';
import bookingSuggestionsRoutes from './routes/booking-suggestions';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Family members routes
app.use('/api/family-members', familyMembersRoutes);

// Extracurricular activities routes
app.use('/api/extracurricular-activities', extracurricularActivitiesRoutes);

// Ideal time allocation routes
app.use('/api/ideal-allocation', idealAllocationRoutes);

// Events routes
app.use('/api/events', eventsRoutes);

// Dashboard routes
app.use('/api/dashboard', dashboardRoutes);

// Thresholds routes
app.use('/api/thresholds', thresholdsRoutes);

// Booking suggestions routes
app.use('/api/booking-suggestions', bookingSuggestionsRoutes);

const PORT = config.app.port;

app.listen(PORT, () => {
  console.log(`Flo backend server running on port ${PORT}`);
  console.log(`Environment: ${config.app.nodeEnv}`);
});

export { app };
