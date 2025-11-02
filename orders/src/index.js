const express = require('express');
const cors = require('cors');
const OrderRepository = require('./repository');
const OrderService = require('./service');
const UserClient = require('./user-client');
const MessageBroker = require('./message-broker');
const OrderEventConsumer = require('./order-event-consumer');
const UserEventConsumer = require('./user-event-consumer');

class OrdersService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3002;
    this.rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

    this.orderRepository = new OrderRepository();
    this.userClient = new UserClient();
    this.messageBroker = new MessageBroker(this.rabbitmqUrl);
    this.orderService = new OrderService(
      this.orderRepository, 
      this.userClient,
      this.messageBroker
    );
    
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
    this.app.get('/health', this.getHealth.bind(this));

    this.app.post('/api/orders', this.createOrder.bind(this));
    this.app.get('/api/orders', this.getAllOrders.bind(this));
    this.app.get('/api/orders/:id', this.getOrderById.bind(this));
    this.app.patch('/api/orders/:id/status', this.updateOrderStatus.bind(this));
    this.app.delete('/api/orders/:id', this.deleteOrder.bind(this));
    this.app.get('/api/orders/user/:userId', this.getOrdersByUserId.bind(this));

    this.app.get('/', (req, res) => {
      res.json({
        service: 'orders-service',
        version: '2.0.0',
        features: ['rabbitmq', 'event-driven'],
        endpoints: {
          health: '/health',
          createOrder: 'POST /api/orders',
          getOrders: 'GET /api/orders',
          getOrder: 'GET /api/orders/:id',
          updateStatus: 'PATCH /api/orders/:id/status',
          getUserOrders: 'GET /api/orders/user/:userId'
        }
      });
    });

    this.app.use((err, req, res, next) => {
      console.error('Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    });
  }

  async createOrder(req, res) {
    try {
      const result = await this.orderService.createOrder(req.body);
      res.status(201).json(result);
    } catch (error) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  async getOrderById(req, res) {
    try {
      const result = await this.orderService.getOrderById(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  async getAllOrders(req, res) {
    try {
      const result = await this.orderService.getAllOrders();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getOrdersByUserId(req, res) {
    try {
      const result = await this.orderService.getOrdersByUserId(req.params.userId);
      res.json(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { status, reason } = req.body;
      const result = await this.orderService.updateOrderStatus(
        req.params.id, 
        status,
        reason
      );
      res.json(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, error: error.message });
      } else if (error.message.includes('Validation error')) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  async deleteOrder(req, res) {
    try {
      const result = await this.orderService.deleteOrder(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  async getHealth(req, res) {
    try {
      const result = await this.orderService.getServiceHealth();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async setupEventConsumers() {
    try {
      // Initialize event consumers
      const orderEventConsumer = new OrderEventConsumer(this.messageBroker);
      const userEventConsumer = new UserEventConsumer(
        this.messageBroker, 
        this.orderRepository
      );

      await orderEventConsumer.start();
      await userEventConsumer.start();

      console.log('✅ Event consumers started successfully');
    } catch (error) {
      console.error('❌ Failed to start event consumers:', error.message);
    }
  }

  async start() {
    try {
      // Connect to RabbitMQ first
      await this.messageBroker.connect();

      // Setup event consumers
      await this.setupEventConsumers();

      // Start HTTP server
      this.app.listen(this.port, () => {
        console.log(`🚀 Orders Service running on port ${this.port}`);
        console.log(`🔗 Users Service URL: ${this.userClient.baseURL}`);
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
      console.error('❌ Failed to start Orders Service:', error.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const service = new OrdersService();
  service.start();
}

module.exports = OrdersService;