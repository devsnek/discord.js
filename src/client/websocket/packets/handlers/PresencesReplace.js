const AbstractHandler = require('./AbstractHandler');
const { WSEvents } = require('../../../../util/Constants');

class PresencesReplaceHandler extends AbstractHandler {
  handle(packet) {
    for (const data of packet.d) {
      this.packetManager.handlers[WSEvents.PRESENCE_UPDATE]({ d: data });
    }
  }
}

module.exports = PresencesReplaceHandler;
