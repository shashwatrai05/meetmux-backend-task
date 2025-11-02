const Joi = require('joi');

class OrderService {
  constructor(orderRepository, userClient, messageBroker = null) {
    this.orderRepository = orderRepository;
    this.userClient = userClient;
    this.messageBroker = messageBroker;
    
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
    // Validate input
    const { error, value } = this.createSchema.validate(orderData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    // Verify user exists
    const userProfile = await this.userClient.getUserProfile(value.userId);
    
    if (!userProfile) {
      throw new Error(`User with ID ${value.userId} not found`);
    }

    // Calculate total
    const totalAmount = value.items.reduce((total, item) => {
      return total + (item.quantity * item.unitPrice);
    }, 0);

    const orderToCreate = {
      ...value,
      userInfo: userProfile,
      totalAmount
    };

    // Create order in repository
    const order = await this.orderRepository.create(orderToCreate);

    // Publish ORDER_CREATED event
    try {
      if (this.messageBroker?.isConnected()) {
        await this.messageBroker.publishOrderEvent('ORDER_CREATED', {
          orderId: order.id,
          userId: order.userId,
          userInfo: order.userInfo,
          items: order.items,
          totalAmount: order.totalAmount,
          shippingAddress: order.shippingAddress,
          status: order.status,
          createdAt: order.createdAt
        }, {
          metadata: {
            source: 'orders-service',
            correlationId: this.generateCorrelationId()
          }
        });
        console.log(`📤 Published ORDER_CREATED event for order ${order.id}`);
      } else {
        console.log('⚠️  Message broker not connected, skipping event publish');
      }
    } catch (error) {
      console.error('⚠️  Failed to publish ORDER_CREATED event:', error.message);
    }

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

  async updateOrderStatus(orderId, status, reason = null) {
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const previousStatus = order.status;
    
    // Update status
    const updatedOrder = await this.orderRepository.updateStatus(orderId, status);

    // Publish status change event
    try {
      if (this.messageBroker?.isConnected()) {
        const eventType = status === 'cancelled' ? 'ORDER_CANCELLED' : 'ORDER_STATUS_CHANGED';
        
        await this.messageBroker.publishOrderEvent(eventType, {
          orderId: updatedOrder.id,
          userId: updatedOrder.userId,
          previousStatus: previousStatus,
          newStatus: status,
          reason: reason,
          updatedAt: updatedOrder.updatedAt
        }, {
          metadata: {
            source: 'orders-service',
            correlationId: this.generateCorrelationId()
          }
        });
        console.log(`📤 Published ${eventType} event for order ${updatedOrder.id}`);
      }
    } catch (error) {
      console.error(`⚠️  Failed to publish order status event:`, error.message);
    }

    return {
      success: true,
      data: updatedOrder,
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
    const messageBrokerHealthy = this.messageBroker?.isConnected() || false;
    
    return {
      success: true,
      data: {
        ordersService: 'healthy',
        usersService: userServiceHealthy ? 'healthy' : 'unhealthy',
        messageBroker: messageBrokerHealthy ? 'healthy' : 'unhealthy',
        dependencies: {
          usersServiceUrl: this.userClient.baseURL,
          messageBrokerConnected: messageBrokerHealthy
        }
      }
    };
  }

  generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = OrderService;