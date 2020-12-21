'use strict';

const APIMessage = require('./APIMessage');
const Interaction = require('./Interaction');

/**
 * Represents a command interaction, see {@link InteractionClient}.
 * @extends {Interaction}
 */
class CommandInteraction extends Interaction {
  constructor(client, data, syncHandle) {
    super(client, data, syncHandle);

    /**
     * The ID of the invoked command.
     * @type {Snowflake}
     * @readonly
     */
    this.commandID = data.data.id;

    /**
     * The name of the invoked command.
     * @type {string}
     * @readonly
     */
    this.commandName = data.data.name;

    /**
     * The options passed to the command.
     * @type {?Object}
     * @readonly
     */
    this.options = data.data.options;
  }
}

module.exports = CommandInteraction;
