const OrderService = require('../src/service');
const OrderRepository = require('../src/repository');
const UserServiceClient = require('../src/user-client');


jest.mock('../src/user-client');

describe('OrderService', () => {
  let orderService;
  let orderRepository;
  let mockUserServiceClient;

  beforeEach(() => {
    orderRepository = new OrderRepository();
    mockUserServiceClient = new UserServiceClient();
    orderService = new OrderService(orderRepository, mockUserServiceClient);
    
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const validOrderData = {
      userId: 'test-user-id',
      items: [
        {
          productId: 'prod-123',
          productName: 'Test Product',
          quantity: 2,
          unitPrice: 99.99
        }
      ],
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'Test Country'
      }
    };

    const mockUserProfile = {
      id: 'test-user-id',
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '+1-555-0123'
    };

    it('should create order when user exists', async () => {
      mockUserServiceClient.getUserProfile.mockResolvedValue(mockUserProfile);

      const result = await orderService.createOrder(validOrderData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data.userId).toBe(validOrderData.userId);
      expect(result.data.userInfo).toEqual(mockUserProfile);
      expect(result.data.totalAmount).toBe(199.98);
      expect(result.data.status).toBe('pending');
      expect(mockUserServiceClient.getUserProfile).toHaveBeenCalledWith('test-user-id');
    });

    it('should throw error when user not found', async () => {
      mockUserServiceClient.getUserProfile.mockResolvedValue(null);

      await expect(orderService.createOrder(validOrderData))
        .rejects.toThrow('User with ID test-user-id not found');
    });

    it('should throw error for invalid order data', async () => {
      const invalidData = { userId: 'test-user-id' };

      await expect(orderService.createOrder(invalidData)).rejects.toThrow();
    });
  });

  describe('getOrderById', () => {
    it('should return order when found', async () => {
      mockUserServiceClient.getUserProfile.mockResolvedValue({
        id: 'test-user-id',
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '+1-555-0123'
      });

      const createResult = await orderService.createOrder({
        userId: 'test-user-id',
        items: [{ productId: 'prod-123', productName: 'Test', quantity: 1, unitPrice: 10.00 }],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country'
        }
      });

      const result = await orderService.getOrderById(createResult.data.id);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(createResult.data.id);
    });

    it('should throw error when order not found', async () => {
      await expect(orderService.getOrderById('nonexistent-id')).rejects.toThrow('Order not found');
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status when valid', async () => {
      mockUserServiceClient.getUserProfile.mockResolvedValue({
        id: 'test-user-id',
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '+1-555-0123'
      });

      const createResult = await orderService.createOrder({
        userId: 'test-user-id',
        items: [{ productId: 'prod-123', productName: 'Test', quantity: 1, unitPrice: 10.00 }],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country'
        }
      });

      const result = await orderService.updateOrderStatus(createResult.data.id, 'confirmed');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('confirmed');
    });

    it('should throw error for invalid status', async () => {
      mockUserServiceClient.getUserProfile.mockResolvedValue({
        id: 'test-user-id',
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '+1-555-0123'
      });

      const createResult = await orderService.createOrder({
        userId: 'test-user-id',
        items: [{ productId: 'prod-123', productName: 'Test', quantity: 1, unitPrice: 10.00 }],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country'
        }
      });

      await expect(orderService.updateOrderStatus(createResult.data.id, 'invalid-status'))
        .rejects.toThrow('Invalid status');
    });
  });

  describe('getServiceHealth', () => {
    it('should return health status with dependencies', async () => {
      mockUserServiceClient.healthCheck.mockResolvedValue(true);

      const result = await orderService.getServiceHealth();

      expect(result.success).toBe(true);
      expect(result.data.ordersService).toBe('healthy');
      expect(result.data.usersService).toBe('healthy');
    });

    it('should report unhealthy when user service is down', async () => {
      mockUserServiceClient.healthCheck.mockResolvedValue(false);

      const result = await orderService.getServiceHealth();

      expect(result.success).toBe(true);
      expect(result.data.ordersService).toBe('healthy');
      expect(result.data.usersService).toBe('unhealthy');
    });
  });
});