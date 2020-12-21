'use strict';

const Base = require('./Base');
const { ApplicationCommandOptionType } = require('../util/Constants');
const Snowflake = require('../util/Snowflake');

/**
 * Represents an application command, see {@link InteractionClient}.
 * @extends {Base}
 */
class ApplicationCommand extends Base {
  constructor(client, data, guildID) {
    super(client);

    /**
     * The ID of the guild this command is part of, if any.
     * @type {Snowflake?}
     * @readonly
     */
    this.guildID = guildID || null;

    this._patch(data);
  }

  _patch(data) {
    /**
     * The ID of this command.
     * @type {Snowflake}
     * @readonly
     */
    this.id = data.id;

    /**
     * The ID of the application which owns this command.
     * @type {Snowflake}
     * @readonly
     */
    this.applicationID = data.application_id;

    /**
     * The name of this command.
     * @type {string}
     * @readonly
     */
    this.name = data.name;

    /**
     * The description of this command.
     * @type {string}
     * @readonly
     */
    this.description = data.description;

    /**
     * The options of this command.
     * @type {Object[]}
     * @readonly
     */
    this.options = data.options?.map(function m(o) {
      return {
        type: ApplicationCommandOptionType[o.type],
        name: o.name,
        description: o.description,
        default: o.default,
        required: o.required,
        choices: o.choices,
        options: o.options?.map(m),
      };
    });
  }

  /**
   * The timestamp the command was created at.
   * @type {number}
   * @readonly
   */
  get createdTimestamp() {
    return Snowflake.deconstruct(this.id).timestamp;
  }

  /**
   * The time the command was created at.
   * @type {Date}
   * @readonly
   */
  get createdAt() {
    return new Date(this.createdTimestamp);
  }

  /**
   * Delete this command.
   */
  async delete() {
    let path = this.client.api.applications('@me');
    if (this.guildID) {
      path = path.guilds(this.guildID);
    }
    await path.commands(this.id).delete();
  }
}

module.exports = ApplicationCommand;
