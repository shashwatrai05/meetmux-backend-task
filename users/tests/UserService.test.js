const UserService = require('../src/service');
const UserRepository = require('../src/repository');

describe('UserService', () => {
  let userService;
  let userRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
    userService = new UserService(userRepository);
  });

  describe('createUser', () => {
    const validUserData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      phone: '+1-555-0123'
    };

    it('should create a user with valid data', async () => {
      const result = await userService.createUser(validUserData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data.firstName).toBe(validUserData.firstName);
      expect(result.data.lastName).toBe(validUserData.lastName);
      expect(result.data.email).toBe(validUserData.email);
      expect(result.data.phone).toBe(validUserData.phone);
      expect(result.data).toHaveProperty('createdAt');
    });

    it('should throw error for missing required fields', async () => {
      const invalidData = { firstName: 'John' };

      await expect(userService.createUser(invalidData)).rejects.toThrow();
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const createResult = await userService.createUser({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@test.com',
        phone: '+1-555-0456'
      });

      const result = await userService.getUserById(createResult.data.id);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(createResult.data.id);
      expect(result.data.firstName).toBe('Jane');
    });

    it('should throw error when user not found', async () => {
      await expect(userService.getUserById('nonexistent-id')).rejects.toThrow('User not found');
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile for service communication', async () => {
      const createResult = await userService.createUser({
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob.johnson@test.com',
        phone: '+1-555-0789'
      });

      const profile = await userService.getUserProfile(createResult.data.id);

      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('fullName');
      expect(profile).toHaveProperty('email');
      expect(profile).toHaveProperty('phone');
      expect(profile.fullName).toBe('Bob Johnson');
    });

    it('should return null when user not found', async () => {
      const profile = await userService.getUserProfile('nonexistent-id');
      expect(profile).toBeNull();
    });
  });
});