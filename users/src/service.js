const Joi = require('joi');

class UserService {
  constructor(userRepository, messageBroker = null) {
    this.userRepository = userRepository;
    this.messageBroker = messageBroker;

    this.createSchema = Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().required()
    });
  }

  async createUser(userData) {
    const { error, value } = this.createSchema.validate(userData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    const user = await this.userRepository.create(value);
    return {
      success: true,
      data: user,
      message: 'User created successfully'
    };
  }

  async getUserById(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      data: user
    };
  }

  async getAllUsers() {
    const users = await this.userRepository.findAll();
    return {
      success: true,
      data: users
    };
  }

  async updateUser(userId, updateData) {
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    const user = await this.userRepository.update(userId, updateData);

    // Publish USER_UPDATED event
    try {
      if (this.messageBroker?.isConnected()) {
        await this.messageBroker.publishUserEvent('USER_UPDATED', {
          userId: user.id,
          updates: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone
          },
          previousData: {
            firstName: existingUser.firstName,
            lastName: existingUser.lastName,
            email: existingUser.email,
            phone: existingUser.phone
          },
          updatedAt: user.updatedAt
        }, {
          metadata: {
            source: 'users-service',
            correlationId: this.generateCorrelationId()
          }
        });
        console.log(`📤 Published USER_UPDATED event for user ${user.id}`);
      }
    } catch (error) {
      console.error('⚠️  Failed to publish USER_UPDATED event:', error.message);
    }

    return {
      success: true,
      data: user,
      message: 'User updated successfully'
    };
  }

  async deleteUser(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const deleted = await this.userRepository.delete(userId);
    if (!deleted) {
      throw new Error('User not found');
    }

    // Publish USER_DELETED event
    try {
      if (this.messageBroker?.isConnected()) {
        await this.messageBroker.publishUserEvent('USER_DELETED', {
          userId: userId,
          deletedAt: new Date()
        }, {
          metadata: {
            source: 'users-service',
            correlationId: this.generateCorrelationId()
          }
        });
        console.log(`📤 Published USER_DELETED event for user ${userId}`);
      }
    } catch (error) {
      console.error('⚠️  Failed to publish USER_DELETED event:', error.message);
    }

    return {
      success: true,
      message: 'User deleted successfully'
    };
  }

  async getUserProfile(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone
    };
  }

  async getUsersByIds(userIds) {
    const users = await this.userRepository.findByIds(userIds);
    return users.map(user => ({
      id: user.id,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone
    }));
  }

  generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = UserService;