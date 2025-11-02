const amqp = require('amqplib');

class MessageBroker {
  constructor(url = 'amqp://localhost:5672') {
    this.url = url;
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    try {
      console.log('📡 Connecting to RabbitMQ...');
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      
      // Setup basic exchanges
      await this.channel.assertExchange('order.events', 'topic', { durable: true });
      await this.channel.assertExchange('user.events', 'topic', { durable: true });
      
      // Setup basic queues
      await this.channel.assertQueue('order.created', { durable: true });
      await this.channel.assertQueue('order.status.changed', { durable: true });
      await this.channel.assertQueue('user.updated', { durable: true });
      await this.channel.assertQueue('user.deleted', { durable: true });
      
      // Bind queues to exchanges
      await this.channel.bindQueue('order.created', 'order.events', 'order.created');
      await this.channel.bindQueue('order.status.changed', 'order.events', 'order.status.changed');
      await this.channel.bindQueue('user.updated', 'user.events', 'user.updated');
      await this.channel.bindQueue('user.deleted', 'user.events', 'user.deleted');
      
      console.log('✅ RabbitMQ connected successfully');
      return this.channel;
    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error.message);
      throw error;
    }
  }

  async publishOrderEvent(eventType, orderData, options = {}) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const event = {
      eventType,
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      data: orderData,
      metadata: options.metadata || {}
    };

    const routingKey = eventType === 'ORDER_CREATED' ? 'order.created' : 'order.status.changed';
    const messageBuffer = Buffer.from(JSON.stringify(event));

    return this.channel.publish('order.events', routingKey, messageBuffer, {
      persistent: true,
      contentType: 'application/json'
    });
  }

  async publishUserEvent(eventType, userData, options = {}) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const event = {
      eventType,
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      data: userData,
      metadata: options.metadata || {}
    };

    const routingKey = eventType === 'USER_UPDATED' ? 'user.updated' : 'user.deleted';
    const messageBuffer = Buffer.from(JSON.stringify(event));

    return this.channel.publish('user.events', routingKey, messageBuffer, {
      persistent: true,
      contentType: 'application/json'
    });
  }

  async consume(queueName, handler) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    await this.channel.consume(queueName, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());
        console.log(`📨 Message from ${queueName}:`, content.eventType);
        
        await handler(content, msg);
        this.channel.ack(msg);
        
        console.log(`✅ Processed message from ${queueName}`);
      } catch (error) {
        console.error(`❌ Error processing ${queueName}:`, error.message);
        this.channel.nack(msg, false, true);
      }
    }, { noAck: false });

    console.log(`👂 Listening on: ${queueName}`);
  }

  isConnected() {
    return this.connection !== null && this.channel !== null;
  }

  async close() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      console.log('🔌 RabbitMQ closed');
    } catch (error) {
      console.error('Error closing RabbitMQ:', error.message);
    }
  }
}

module.exports = MessageBroker;