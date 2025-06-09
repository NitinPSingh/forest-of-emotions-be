const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { handleError } = require('./utils/errorHandler');
const emotionRoutes = require('./routes/emotionRoutes');


dotenv.config();

const app = express();
const port = process.env.PORT || 3001;


app.use(cors());
app.use(express.json());


app.use('/api', emotionRoutes);


app.use(handleError);


app.use('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});


const startServer = () => {
  const server = app.listen(port, () => {
    console.log(`Emotion API server listening on port ${port}`);
  });

  
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });

  
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
  });

  
  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
      console.log('💥 Process terminated!');
    });
  });
};


startServer(); 