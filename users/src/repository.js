const { v4: uuidv4 } = require('uuid');

class UserRepository {
  constructor() {
    this.users = new Map();
    this.initTestData();
  }

  initTestData() {
    const testUser = {
      id: uuidv4(),
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0123',
      createdAt: new Date()
    };
    this.users.set(testUser.id, testUser);
  }

  async create(userData) {
    const id = uuidv4();
    const user = { ...userData, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async findById(id) {
    return this.users.get(id) || null;
  }

  async findAll() {
    return Array.from(this.users.values());
  }

  async update(id, updateData) {
    const user = this.users.get(id);
    if (!user) return null;
    
    const updated = { ...user, ...updateData, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id) {
    return this.users.delete(id);
  }

  async findByIds(ids) {
    return ids.map(id => this.users.get(id)).filter(Boolean);
  }
}

module.exports = UserRepository;