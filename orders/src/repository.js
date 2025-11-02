const { v4: uuidv4 } = require('uuid');

class OrderRepository {
  constructor() {
    this.orders = new Map();
  }

  async create(orderData) {
    const id = uuidv4();
    const order = {
      ...orderData,
      id,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.orders.set(id, order);
    return order;
  }

  async findById(id) {
    return this.orders.get(id) || null;
  }

  async findAll() {
    return Array.from(this.orders.values());
  }

  async findByUserId(userId) {
    return Array.from(this.orders.values()).filter(order => order.userId === userId);
  }

  async update(id, updateData) {
    const order = this.orders.get(id);
    if (!order) return null;

    const updated = { ...order, ...updateData, updatedAt: new Date() };
    this.orders.set(id, updated);
    return updated;
  }

  async updateStatus(id, status) {
    const order = this.orders.get(id);
    if (!order) return null;

    order.status = status;
    order.updatedAt = new Date();
    this.orders.set(id, order);
    return order;
  }

  async delete(id) {
    return this.orders.delete(id);
  }
}

module.exports = OrderRepository;