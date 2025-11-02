class OrderEventConsumer {
  constructor(messageBroker) {
    this.messageBroker = messageBroker;
  }

  async start() {
    console.log('🎧 Starting Order Event Consumers...');

    try {
      // Consumer 1: Order Created
      await this.messageBroker.consume(
        'order.created',
        this.handleOrderCreated.bind(this)
      );

      // Consumer 2: Order Status Changed
      await this.messageBroker.consume(
        'order.status.changed',
        this.handleOrderStatusChanged.bind(this)
      );

      console.log('✅ Order event consumers started');
    } catch (error) {
      console.error('❌ Failed to start order consumers:', error.message);
      throw error;
    }
  }

  async handleOrderCreated(event, msg) {
    try {
      console.log('🆕 Processing ORDER_CREATED event');
      console.log('   Event data:', JSON.stringify(event.data, null, 2));
      
      const { orderId, userInfo, items, totalAmount, userId } = event.data;
      
      if (!orderId) {
        console.error('❌ Missing orderId in event data');
        return;
      }

      console.log(`   Order ID: ${orderId}`);

      // Check if userInfo exists
      if (userInfo && userInfo.email) {
        console.log(`📧 Sending order confirmation email to ${userInfo.email}`);
        console.log(`   Customer: ${userInfo.fullName || 'N/A'}`);
      } else {
        console.log(`⚠️  No user info available for order ${orderId}`);
        console.log(`   User ID: ${userId || 'N/A'}`);
      }
      
      // Show order details
      if (totalAmount) {
        console.log(`   Total: $${totalAmount.toFixed(2)}`);
      }
      
      // Simulate inventory reservation
      if (items && items.length > 0) {
        console.log(`📦 Reserving inventory for order ${orderId}`);
        for (const item of items) {
          if (item.productName && item.quantity) {
            console.log(`   - ${item.productName} x${item.quantity}`);
          }
        }
      } else {
        console.log(`⚠️  No items in order ${orderId}`);
      }
      
      // Simulate analytics
      console.log(`📊 Recording order metrics`);
      
      console.log(`✅ Finished processing ORDER_CREATED for ${orderId}`);
    } catch (error) {
      console.error('❌ Error in handleOrderCreated:', error.message);
      console.error('   Stack:', error.stack);
    }
  }

  async handleOrderStatusChanged(event, msg) {
    try {
      console.log('📈 Processing ORDER_STATUS_CHANGED event');
      
      const { orderId, newStatus, previousStatus } = event.data;
      
      if (!orderId) {
        console.error('❌ Missing orderId in event data');
        return;
      }

      console.log(`   Order ID: ${orderId}`);
      console.log(`   Status: ${previousStatus || 'unknown'} → ${newStatus || 'unknown'}`);
      
      if (newStatus === 'shipped') {
        console.log(`🚚 Triggering shipping notification for order ${orderId}`);
      }
      
      if (newStatus === 'delivered') {
        console.log(`⭐ Scheduling review request for order ${orderId}`);
      }
      
      console.log(`✅ Finished processing ORDER_STATUS_CHANGED for ${orderId}`);
    } catch (error) {
      console.error('❌ Error in handleOrderStatusChanged:', error.message);
    }
  }
}

module.exports = OrderEventConsumer;