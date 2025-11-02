const Joi = require('joi');

class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;

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
    const user = await this.userRepository.update(userId, updateData);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      data: user,
      message: 'User updated successfully'
    };
  }

  async deleteUser(userId) {
    const deleted = await this.userRepository.delete(userId);
    if (!deleted) {
      throw new Error('User not found');
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
}

module.exports = UserService;