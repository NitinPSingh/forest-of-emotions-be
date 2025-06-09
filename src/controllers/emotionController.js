const prisma = require('../config/prisma');
const { HfInference } = require('@huggingface/inference');
const { startOfDay, endOfDay, format } = require('date-fns');
const  emotionMapping  = require('../utils/constants');

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

function mapEmotionToPlutchik(originalEmotion) {
 
  return emotionMapping[originalEmotion.toLowerCase()] || 'neutral';
}

const emotionPriority = {
  joy: 10,
  excitement: 9,
  trust: 8,
  surprise: 7,
  anticipation: 6,
  anger: 5,
  fear: 4,
  disgust: 3,
  sadness: 2,
  neutral: 1
};
const emotionController = {
  
  async analyzeEmail(req, res) {
    try {
     
      const {
        Subject,
        TextBody,
        FromName,
        FromFull,
        To,
        MessageID,
        Date: DateString,
        Attachments,
      } = req.body;
  
      const result = await hf.textClassification({
        model: 'SamLowe/roberta-base-go_emotions',
        inputs: TextBody,
      });
  
      const originalEmotion = result[0]?.label || 'unknown';
      const mappedEmotion = mapEmotionToPlutchik(originalEmotion);
      const priority = emotionPriority[mappedEmotion] || 1;
  
      const saved = await prisma.emotionLog.create({
        data: {
          emailSubject: Subject,
          emailBody: TextBody,
          emotion: mappedEmotion,
          originalEmotion: originalEmotion,
          fromName: FromName,
          fromEmail: FromFull?.Email,
          toEmail: To,
          messageId: MessageID,
          date: DateString ? new Date(DateString) : null,
          analysis: result || null,
          attachment: Attachments || null,
          priority: priority 
        },
      });
  
      res.status(201).json({
        ...saved,
        
      });
    } catch (error) {
      console.error('Emotion inference failed:', error);
      res.status(500).json({ error: 'Failed to process email.' });
    }
  },
  
  async getPredominantEmotionByDate(req, res) {
    const { startTime, endTime } = req.query;
  
    try {
      const where = {};
      if (startTime) where.createdAt = { gte: new Date(startTime) };
      if (endTime) where.createdAt = { ...(where.createdAt || {}), lte: new Date(endTime) };
  
      
      const grouped = await prisma.emotionLog.groupBy({
        by: ['emotion', 'createdAt'],
        where,
        _count: {
          emotion: true,
        },
        orderBy: [
          { createdAt: 'asc' },
          { _count: { emotion: 'desc' } }
        ],
      });
  
      
      const dailyMap = {};
  
      grouped.forEach((item) => {
        const dateKey = format(new Date(item.createdAt), 'yyyy-MM-dd');
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = [];
        }
        dailyMap[dateKey].push({
          emotion: item.emotion,
          count: item._count.emotion,
          priority: emotionPriority[item.emotion] || 1
        });
      });
  
      
      const results = [];
  
      for (const dateKey of Object.keys(dailyMap)) {
        const emotions = dailyMap[dateKey];
        
        
        emotions.sort((a, b) => {
          
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }
          
          return b.count - a.count;
        });
  
        const predominantEmotion = emotions[0].emotion;
  
        
        const exampleLog = await prisma.emotionLog.findFirst({
          where: {
            emotion: predominantEmotion,
            createdAt: {
              gte: startOfDay(new Date(dateKey)),
              lte: endOfDay(new Date(dateKey)),
            },
          },
          select: {
            emailSubject: true,
            createdAt: true,
            emotion: true,
            priority: true,
          },
        });
  
        if (exampleLog) {
          results.push({
            emotion: predominantEmotion,
            createdAt: format(new Date(exampleLog.createdAt), 'yyyy-MM-dd'),
            emailSubject: exampleLog.emailSubject,
            priority: exampleLog.priority,
          });
        }
      }
  
      res.json(results);
    } catch (error) {
      console.error('Failed to get predominant emotions by date:', error);
      res.status(500).json({ error: 'Failed to get predominant emotions by date' });
    }
  },
  

  
  async getEmotionLogs(req, res) {
    try {
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      
      const offset = (page - 1) * limit;
      
      
      const totalRecords = await prisma.emotionLog.count();
      const totalPages = Math.ceil(totalRecords / limit);
      
      
      const logs = await prisma.emotionLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });
      
      
      res.json({
        data: logs,
        pagination: {
          currentPage: page,
          limit: limit,
          totalPages: totalPages,
          totalRecords: totalRecords,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        }
      });
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      res.status(500).json({ error: 'Could not fetch logs' });
    }
  },

  
  async getEmotionLog(req, res) {
    const { id } = req.params;
    try {
      const log = await prisma.emotionLog.findUnique({ 
        where: { id } 
      });
      
      if (!log) {
        return res.status(404).json({ error: 'Not found' });
      }
      
      res.json(log);
    } catch (error) {
      console.error('Failed to fetch log:', error);
      res.status(500).json({ error: 'Error fetching log' });
    }
  },

  
  async deleteEmotionLog(req, res) {
    const { id } = req.params;
    try {
      await prisma.emotionLog.delete({ 
        where: { id } 
      });
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete log:', error);
      res.status(500).json({ error: 'Could not delete log' });
    }
  },

  
  async getEmotionCounts(req, res) {
    try {
      const counts = await prisma.emotionLog.groupBy({
        by: ['emotion'],
        _count: {
          emotion: true
        },
        orderBy: {
          _count: {
            emotion: 'desc'
          }
        }
      });

      res.json(counts);
    } catch (error) {
      console.error('Failed to get emotion counts:', error);
      res.status(500).json({ error: 'Metrics failed' });
    }
  },

  
  async getDailySummary(req, res) {
    try {
      const summary = await prisma.emotionLog.groupBy({
        by: ['emotion', 'createdAt'],
        _count: {
          emotion: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json(summary);
    } catch (error) {
      console.error('Failed to get daily summary:', error);
      res.status(500).json({ error: 'Failed to load summary' });
    }
  },

  
  async getEmotionSummary(req, res) {
    const { mode = 'day', startTime, endTime } = req.query;

    try {
      const where = {};
      if (startTime) where.createdAt = { gte: new Date(startTime) };
      if (endTime) where.createdAt = { ...where.createdAt, lte: new Date(endTime) };

      const summary = await prisma.emotionLog.groupBy({
        by: ['emotion'],
        where,
        _count: {
          emotion: true
        },
        orderBy: {
          _count: {
            emotion: 'desc'
          }
        }
      });

      res.json(summary);
    } catch (error) {
      console.error('Failed to get emotion summary:', error);
      res.status(500).json({ error: 'Failed to generate summary' });
    }
  },

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  

  
  
  
  
  
  
  
  
  

  
  
  
  
  
  
  
  

  
  
  
  
  
  
  
  
  

  
  async getAllEmotions(req, res) {
    const { startTime, endTime } = req.query;
  
    try {
      const where = {};
      if (startTime) where.createdAt = { gte: new Date(startTime) };
      if (endTime) where.createdAt = { ...(where.createdAt || {}), lte: new Date(endTime) };
  
      const emotions = await prisma.emotionLog.findMany({
        where,
        select: {
          id: true,
          emotion: true,
      
          emailSubject: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
  
      res.json(emotions);
    } catch (error) {
      console.error('Failed to get all emotions:', error);
      res.status(500).json({ error: 'Failed to get all emotions' });
    }
  }
};

module.exports = emotionController; 