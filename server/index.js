require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');
const { connectDb } = require('./config/db');
const { migrateLegacyRoomMembers } = require('./config/migrateRooms');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { attachSocketIO } = require('./socket');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || true,
    methods: ['GET', 'POST'],
  },
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '100kb' }));

app.use('/api/auth', authRoutes);
app.use('/api', roomRoutes);
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const clientDist = path.join(__dirname, '..', 'client', 'dist');
const spaIndex = path.join(clientDist, 'index.html');
if (fs.existsSync(spaIndex)) {
  app.use(express.static(clientDist));
  app.get('/join', (req, res) => {
    res.sendFile(spaIndex);
  });
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(spaIndex);
  });
}

app.use(errorHandler);

attachSocketIO(io);

connectDb()
  .then(() => migrateLegacyRoomMembers())
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });
