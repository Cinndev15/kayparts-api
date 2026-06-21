const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const routes = require('./routes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || process.env.APP_PORT || 8000;

// Enable CORS
app.use(cors({
  origin: '*', // Adjust to match allowed origins
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Request payload parsing
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Serve Uploads as static files
// Exposes '/uploads' to match Laravel asset('uploads/...') mapping
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Swagger Documentation UI
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./config/swagger.json');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Register API Routes
app.use('/api', routes);

// Base route test - serve beautiful landing page
const landingController = require('./controllers/landingController');
app.get('/', landingController.serveLanding);
app.get('/api', landingController.serveLanding);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  return res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.APP_ENV === 'local' ? err.stack : undefined
  });
});

// Connect to Database and start server
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connection to the MySQL database has been established successfully.');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
}

startServer();
