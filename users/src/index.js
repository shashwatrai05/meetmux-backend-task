const express = require('express');
const cors = require('cors');
const UserRepository = require('./repository');
const UserService = require('./service');
const MessageBroker = require('./message-broker');

class UsersService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

    this.userRepository = new UserRepository();
    this.messageBroker = new MessageBroker(this.rabbitmqUrl);
    this.userService = new UserService(this.userRepository, this.messageBroker);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());

    this.app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      const messageBrokerHealthy = this.messageBroker?.isConnected() || false;
      res.json({ 
        success: true, 
        service: 'users-service', 
        status: 'healthy',
        messageBroker: messageBrokerHealthy ? 'healthy' : 'unhealthy'
      });
    });

    this.app.post('/api/users', this.createUser.bind(this));
    this.app.get('/api/users', this.getAllUsers.bind(this));
    this.app.get('/api/users/:id', this.getUserById.bind(this));
    this.app.put('/api/users/:id', this.updateUser.bind(this));
    this.app.delete('/api/users/:id', this.deleteUser.bind(this));
    this.app.get('/api/users/:id/profile', this.getUserProfile.bind(this));
    this.app.post('/api/users/batch', this.getUsersByIds.bind(this));

    this.app.use((err, req, res, next) => {
      console.error('Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    });
  }

  async createUser(req, res) {
    try {
      const result = await this.userService.createUser(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getUserById(req, res) {
    try {
      const result = await this.userService.getUserById(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  async getAllUsers(req, res) {
    try {
      const result = await this.userService.getAllUsers();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateUser(req, res) {
    try {
      const result = await this.userService.updateUser(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  async deleteUser(req, res) {
    try {
      const result = await this.userService.deleteUser(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  async getUserProfile(req, res) {
    try {
      const profile = await this.userService.getUserProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      res.json({ success: true, data: profile });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getUsersByIds(req, res) {
    try {
      const { userIds } = req.body;
      const users = await this.userService.getUsersByIds(userIds || []);
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async start() {
    try {
      // Connect to RabbitMQ
      await this.messageBroker.connect();

      // Start HTTP server
      this.app.listen(this.port, () => {
        console.log(`🚀 Users Service running on port ${this.port}`);
        console.log(`🐰 RabbitMQ URL: ${this.rabbitmqUrl}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', async () => {
        console.log('SIGTERM received, shutting down gracefully...');
        await this.messageBroker.close();
        process.exit(0);
      });

      process.on('SIGINT', async () => {
        console.log('SIGINT received, shutting down gracefully...');
        await this.messageBroker.close();
        process.exit(0);
      });

    } catch (error) {
      console.error('❌ Failed to start Users Service:', error.message);
      // Service can still run without RabbitMQ for basic operations
      this.app.listen(this.port, () => {
        console.log(`⚠️  Users Service running on port ${this.port} (RabbitMQ unavailable)`);
      });
    }
  }
}

if (require.main === module) {
  const service = new UsersService();
  service.start();
}

module.exports = UsersService;