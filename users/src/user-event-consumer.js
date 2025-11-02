class UserEventConsumer {
  constructor(messageBroker, orderRepository) {
    this.messageBroker = messageBroker;
    this.orderRepository = orderRepository;
  }

  async start() {
    console.log('🎧 Starting User Event Consumers...');

    try {
      // Consumer: User Updated
      await this.messageBroker.consume(
        'user.updated',
        this.handleUserUpdated.bind(this)
      );

      // Consumer: User Deleted
      await this.messageBroker.consume(
        'user.deleted',
        this.handleUserDeleted.bind(this)
      );

      console.log('✅ User event consumers started');
    } catch (error) {
      console.error('❌ Failed to start user consumers:', error.message);
      throw error;
    }
  }

  async handleUserUpdated(event, msg) {
    console.log('👤 Processing USER_UPDATED event:', event.data.userId);
    
    const { userId, updates } = event.data;
    
    // Find all orders for this user
    const userOrders = await this.orderRepository.findByUserId(userId);
    
    if (userOrders.length === 0) {
      console.log(`   No orders found for user ${userId}`);
      return;
    }

    console.log(`   Found ${userOrders.length} orders for user ${userId}`);

    // Update user info in each order
    for (const order of userOrders) {
      try {
        const updatedUserInfo = {
          ...order.userInfo,
          ...updates
        };

        // If fullName components changed, recalculate fullName
        if (updates.firstName || updates.lastName) {
          const firstName = updates.firstName || order.userInfo.firstName || '';
          const lastName = updates.lastName || order.userInfo.lastName || '';
          updatedUserInfo.fullName = `${firstName} ${lastName}`.trim();
        }

        await this.orderRepository.update(order.id, {
          userInfo: updatedUserInfo,
          userInfoLastSynced: new Date()
        });

        console.log(`   ✅ Updated user info in order ${order.id}`);
      } catch (error) {
        console.error(`   ❌ Failed to update order ${order.id}:`, error.message);
      }
    }

    console.log(`✅ Synced user data to ${userOrders.length} orders`);
  }

  async handleUserDeleted(event, msg) {
    console.log('🗑️  Processing USER_DELETED event:', event.data.userId);
    
    const { userId } = event.data;
    
    // Find all orders for this user
    const userOrders = await this.orderRepository.findByUserId(userId);
    
    if (userOrders.length === 0) {
      console.log(`   No orders found for user ${userId}`);
      return;
    }

    console.log(`   Found ${userOrders.length} orders for deleted user ${userId}`);

    // Anonymize user data (GDPR compliant)
    for (const order of userOrders) {
      try {
        const anonymizedUserInfo = {
          id: userId,
          fullName: '[Deleted User]',
          email: '[deleted]',
          phone: '[deleted]'
        };

        await this.orderRepository.update(order.id, {
          userInfo: anonymizedUserInfo,
          userDeleted: true,
          userDeletedAt: new Date()
        });

        console.log(`   ✅ Anonymized user data in order ${order.id}`);
      } catch (error) {
        console.error(`   ❌ Failed to anonymize order ${order.id}:`, error.message);
      }
    }

    console.log(`✅ Processed ${userOrders.length} orders for deleted user`);
  }
}

module.exports = UserEventConsumer;