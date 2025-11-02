const Joi = require('joi');

class OrderService {
  constructor(orderRepository, userClient) {
    this.orderRepository = orderRepository;
    this.userClient = userClient;
    
    this.createSchema = Joi.object({
      userId: Joi.string().required(),
      items: Joi.array().items(
        Joi.object({
          productId: Joi.string().required(),
          productName: Joi.string().required(),
          quantity: Joi.number().min(1).required(),
          unitPrice: Joi.number().min(0).required()
        })
      ).min(1).required(),
      shippingAddress: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zipCode: Joi.string().required(),
        country: Joi.string().required()
      }).required()
    });
  }

  async createOrder(orderData) {

    const { error, value } = this.createSchema.validate(orderData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    const userProfile = await this.userClient.getUserProfile(value.userId);
    
    if (!userProfile) {
      throw new Error(`User with ID ${value.userId} not found`);
    }

    const totalAmount = value.items.reduce((total, item) => {
      return total + (item.quantity * item.unitPrice);
    }, 0);

    const orderToCreate = {
      ...value,
      userInfo: userProfile,
      totalAmount
    };

    const order = await this.orderRepository.create(orderToCreate);

    return {
      success: true,
      data: order,
      message: 'Order created successfully'
    };
  }

  async getOrderById(orderId) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    return {
      success: true,
      data: order
    };
  }

  async getAllOrders() {
    const orders = await this.orderRepository.findAll();
    return {
      success: true,
      data: orders
    };
  }

  async getOrdersByUserId(userId) {
    const userProfile = await this.userClient.getUserProfile(userId);
    if (!userProfile) {
      throw new Error('User not found');
    }

    const orders = await this.orderRepository.findByUserId(userId);
    return {
      success: true,
      data: orders
    };
  }

  async updateOrderStatus(orderId, status) {
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await this.orderRepository.updateStatus(orderId, status);
    if (!order) {
      throw new Error('Order not found');
    }

    return {
      success: true,
      data: order,
      message: `Order status updated to ${status}`
    };
  }

  async deleteOrder(orderId) {
    const deleted = await this.orderRepository.delete(orderId);
    if (!deleted) {
      throw new Error('Order not found');
    }

    return {
      success: true,
      message: 'Order deleted successfully'
    };
  }

  async getServiceHealth() {
    const userServiceHealthy = await this.userClient.healthCheck();
    return {
      success: true,
      data: {
        ordersService: 'healthy',
        usersService: userServiceHealthy ? 'healthy' : 'unhealthy',
        dependencies: {
          usersServiceUrl: this.userClient.baseURL
        }
      }
    };
  }
}

module.exports = OrderService;