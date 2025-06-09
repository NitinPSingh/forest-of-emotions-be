const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { HfInference } = require('@huggingface/inference');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const prisma = new PrismaClient();


const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);


app.use(cors());
app.use(express.json());



const dummyEmotionLogs = [
  {
    id: '1',
    emailSubject: 'Great news about the project!',
    emailBody: 'The project was a huge success and everyone is happy with the results.',
    emotion: 'joy',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(), 
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    emailSubject: 'Meeting tomorrow',
    emailBody: 'Please prepare for the important meeting tomorrow morning.',
    emotion: 'neutral',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), 
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    emailSubject: 'Project deadline extension',
    emailBody: 'We need to extend the deadline due to unexpected challenges.',
    emotion: 'sadness',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), 
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    emailSubject: 'Urgent: System outage',
    emailBody: 'The production system is down and we need immediate attention!',
    emotion: 'fear',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), 
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    emailSubject: 'New client acquisition',
    emailBody: 'We just signed a major new client! This is amazing news!',
    emotion: 'joy',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), 
    updatedAt: new Date().toISOString()
  },
  {
    id: '6',
    emailSubject: 'Team conflict resolution',
    emailBody: 'There was a disagreement in the team that needs to be addressed.',
    emotion: 'anger',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(), 
    updatedAt: new Date().toISOString()
  },
  {
    id: '7',
    emailSubject: 'Unexpected bonus',
    emailBody: 'Everyone will receive an unexpected bonus this month!',
    emotion: 'surprise',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), 
    updatedAt: new Date().toISOString()
  }
];



app.post('/inbound-email', async (req, res) => {
  try {
    const { Subject, TextBody } = req.body;
    //console.log(req.body)
    const result = await hf.textClassification({
      model: 'SamLowe/roberta-base-go_emotions',
      inputs: TextBody,
    });

    const primaryEmotion = result[0]?.label || 'unknown';

    const saved = await prisma.emotionLog.create({
      data: {
        emailSubject: Subject,
        emailBody: TextBody,
        emotion: primaryEmotion,
      },
    });

    res.status(201).json(saved);
  } catch (error) {
    console.error('Emotion inference failed:', error);
    res.status(500).json({ error: 'Failed to process email.' });
  }
});


app.get('/emotion-logs', async (req, res) => {
  try {
    const logs = await prisma.emotionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch logs' });
  }
});


app.get('/emotion-logs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const log = await prisma.emotionLog.findUnique({ where: { id } });
    if (!log) return res.status(404).json({ error: 'Not found' });
    res.json(log);
  } catch {
    res.status(500).json({ error: 'Error fetching log' });
  }
});


app.delete('/emotion-logs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.emotionLog.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Could not delete log' });
  }
});


app.get('/metrics/emotion-count', async (req, res) => {
  try {
    const counts = await prisma.$queryRaw`
      SELECT emotion, COUNT(*) as count 
      FROM "EmotionLog"
      GROUP BY emotion
      ORDER BY count DESC;
    `;
    res.json(counts);
  } catch (e) {
    res.status(500).json({ error: 'Metrics failed' });
  }
});


app.get('/metrics/daily-summary', async (req, res) => {
  try {
    const summary = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        emotion,
        COUNT(*) as count
      FROM "EmotionLog"
      GROUP BY date, emotion
      ORDER BY date DESC;
    `;
    res.json(summary);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load summary' });
  }
});


app.get('/metrics/emotion-summary', async (req, res) => {
  const { mode = 'day', startTime, endTime } = req.query;

  const groupBy =
    mode === 'month' ? `DATE_TRUNC('month', "createdAt")` :
    mode === 'week'  ? `DATE_TRUNC('week', "createdAt")` :
                       `DATE_TRUNC('day', "createdAt")`;

  try {
    const conditions = [];
    if (startTime) conditions.push(`"createdAt" >= TIMESTAMP '${startTime}'`);
    if (endTime)   conditions.push(`"createdAt" <= TIMESTAMP '${endTime}'`);
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const results = await prisma.$queryRawUnsafe(`
      SELECT 
        ${groupBy} AS period,
        emotion,
        COUNT(*) as count
      FROM "EmotionLog"
      ${whereClause}
      GROUP BY period, emotion
      ORDER BY period DESC
    `);

    res.json(results);
  } catch (e) {
    console.error('Error generating emotion summary:', e);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});


app.get('/metrics/latest-emotion', async (req, res) => {
  const { startTime, endTime } = req.query;
  try {
    const conditions = [];
    if (startTime) conditions.push(`"createdAt" >= TIMESTAMP '${startTime}'`);
    if (endTime)   conditions.push(`"createdAt" <= TIMESTAMP '${endTime}'`);
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const result = await prisma.$queryRawUnsafe(`
      SELECT emotion, "createdAt"
      FROM "EmotionLog"
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);
    
    const latestEmotion = result[0]?.emotion || null;
    const timestamp = result[0]?.createdAt || null;
    
    res.json({ 
      latestEmotion,
      timestamp 
    });
  } catch (e) {
    console.error('Error getting latest emotion:', e);
    res.status(500).json({ error: 'Failed to get latest emotion' });
  }
});


app.listen(port, () => {
  console.log(`Emotion API server listening on port ${port}`);
});
