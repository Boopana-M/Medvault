const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const recordRoutes = require('./routes/recordRoutes');
const shareRoutes = require('./routes/shareRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const doctorRoutes = require('./routes/doctorRoutes');

// Create app
const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://client-fse3v3mxv-boopana-ms-projects.vercel.app',
  'https://client-umber-three-95.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api/', limiter);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'MedVault API is running!' });
});

// Routes
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/doctor', doctorRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('🏥 MedVault API is running...');
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Test API: http://localhost:${PORT}/api/test`);
});