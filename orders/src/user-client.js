const axios = require('axios');

class UserClient {
  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.timeout = 5000;
  }

  async getUserProfile(userId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/users/${userId}/profile`, {
        timeout: this.timeout
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      
      return null;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; 
      }
      
      throw new Error(`Users service unavailable: ${error.message}`);
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 3000
      });
      return response.data.success === true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = UserClient;