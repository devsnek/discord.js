const UserAgentManager = require('./UserAgentManager');
const SequentialRequestHandler = require('./RequestHandlers/Sequential');
const BurstRequestHandler = require('./RequestHandlers/Burst');
const APIRequest = require('./APIRequest');
const mountApi = require('./APIRouter');
const Constants = require('../../util/Constants');

class RESTManager {
  constructor(client) {
    this.client = client;
    this.handlers = {};
    this.userAgentManager = new UserAgentManager(this);
    this.rateLimitedEndpoints = {};
    this.globallyRateLimited = false;

    this.api = mountApi(this);
  }

  destroy() {
    for (const handlerID in this.handlers) {
      this.handlers[handlerID].destroy();
    }
  }

  push(handler, apiRequest) {
    return new Promise((resolve, reject) => {
      handler.push({
        request: apiRequest,
        resolve,
        reject,
      });
    });
  }

  getRequestHandler() {
    switch (this.client.options.apiRequestMethod) {
      case 'sequential':
        return SequentialRequestHandler;
      case 'burst':
        return BurstRequestHandler;
      default:
        throw new Error(Constants.Errors.INVALID_RATE_LIMIT_METHOD);
    }
  }

  request(method, url, options = {}) {
    const apiRequest = new APIRequest(this, method, url, options);
    if (!this.handlers[apiRequest.route]) {
      const RequestHandlerType = this.getRequestHandler();
      this.handlers[apiRequest.route] = new RequestHandlerType(this, apiRequest.route);
    }

    return this.push(this.handlers[apiRequest.route], apiRequest);
  }
}

module.exports = RESTManager;
