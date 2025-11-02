const UserServiceClient = require('../src/user-client');
const nock = require('nock');

describe('UserServiceClient', () => {
  let userServiceClient;
  const baseURL = 'http://localhost:3001';

  beforeEach(() => {
    userServiceClient = new UserServiceClient(baseURL);
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('getUserProfile', () => {
    it('should return user profile when user exists', async () => {
      const userId = 'test-user-id';
      const mockUserProfile = {
        id: userId,
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '+1-555-0123'
      };

      nock(baseURL)
        .get(`/api/users/${userId}/profile`)
        .reply(200, {
          success: true,
          data: mockUserProfile
        });

      const result = await userServiceClient.getUserProfile(userId);

      expect(result).toEqual(mockUserProfile);
    });

    it('should return null when user not found', async () => {
      const userId = 'nonexistent-user-id';

      nock(baseURL)
        .get(`/api/users/${userId}/profile`)
        .reply(404, {
          success: false,
          error: 'User not found'
        });

      const result = await userServiceClient.getUserProfile(userId);

      expect(result).toBeNull();
    });

    it('should throw error when service is unavailable', async () => {
      const userId = 'test-user-id';

      nock(baseURL)
        .get(`/api/users/${userId}/profile`)
        .reply(500, {
          success: false,
          error: 'Internal server error'
        });

      await expect(userServiceClient.getUserProfile(userId))
        .rejects.toThrow('Users service unavailable');
    });
  });

  describe('healthCheck', () => {
    it('should return true when service is healthy', async () => {
      nock(baseURL)
        .get('/health')
        .reply(200, {
          success: true,
          service: 'users-service',
          status: 'healthy'
        });

      const result = await userServiceClient.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when service is unhealthy', async () => {
      nock(baseURL)
        .get('/health')
        .reply(503, {
          success: false,
          error: 'Service unavailable'
        });

      const result = await userServiceClient.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false when request times out', async () => {
      nock(baseURL)
        .get('/health')
        .delay(5000) // Longer than timeout
        .reply(200, { success: true });

      const result = await userServiceClient.healthCheck();

      expect(result).toBe(false);
    });
  });
});