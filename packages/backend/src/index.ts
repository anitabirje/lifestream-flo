import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config/env';
import authRoutes from './routes/auth';
import familyMembersRoutes from './routes/family-members';
import extracurricularActivitiesRoutes from './routes/extracurricular-activities';
import idealAllocationRoutes from './routes/ideal-allocation';
import eventsRoutes from './routes/events';
import dashboardRoutes from './routes/dashboard';
import thresholdsRoutes from './routes/thresholds';
import bookingSuggestionsRoutes from './routes/booking-suggestions';
import calendarSourcesRoutes from './routes/calendar-sources';
import oauthRoutes from './routes/oauth';
import notificationPreferencesRoutes from './routes/notification-preferences';
import conflictsRoutes from './routes/conflicts';
import syncRoutes from './routes/sync';
import pushSubscriptionsRoutes from './routes/push-subscriptions';
import { initializeWebSocketServer } from './services/websocket-server';

const app = express();
const httpServer = createServer(app);

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

// Calendar sources routes
app.use('/api/calendar-sources', calendarSourcesRoutes);

// OAuth routes
app.use('/api/oauth', oauthRoutes);

// Notification preferences routes
app.use('/api/notification-preferences', notificationPreferencesRoutes);

// Conflicts routes
app.use('/api/conflicts', conflictsRoutes);

// Sync routes
app.use('/api/sync', syncRoutes);

// Push subscriptions routes
app.use('/api/push-subscriptions', pushSubscriptionsRoutes);

// Initialize WebSocket server
const wsServer = initializeWebSocketServer(httpServer);
console.log('WebSocket server initialized');

const PORT = config.app.port;

httpServer.listen(PORT, () => {
  console.log(`Flo backend server running on port ${PORT}`);
  console.log(`Environment: ${config.app.nodeEnv}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
});

export { app, httpServer, wsServer };
