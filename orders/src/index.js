const express = require('express');
const cors = require('cors');
const OrderRepository = require('./repository');
const OrderService = require('./service');
const UserClient = require('./user-client');

class OrdersService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3002;

    this.orderRepository = new OrderRepository();
    this.userClient = new UserClient();
    this.orderService = new OrderService(this.orderRepository, this.userClient);
    
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
        service: 'simple-orders-service',
        version: '1.0.0',
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
      const { status } = req.body;
      const result = await this.orderService.updateOrderStatus(req.params.id, status);
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

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 Simple Orders Service running on port ${this.port}`);
      console.log(`🔗 Users Service URL: ${this.userClient.baseURL}`);
    });
  }
}

if (require.main === module) {
  const service = new OrdersService();
  service.start();
}

module.exports = OrdersService;