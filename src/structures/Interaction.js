'use strict';

const Base = require('./Base');
const { InteractionType } = require('../util/Constants');
const Snowflake = require('../util/Snowflake');

/**
 * Represents any interaction, see {@link InteractionClient}.
 * @extends {Base}
 * @abstract
 */
class Interaction extends Base {
  constructor(client, data, syncHandle) {
    super(client);

    const type = Object.keys(InteractionType)[data.type];
    /**
     * The type of the interaction, either:
     * * `application_command` - an application command interaction
     * @type {string}
     */
    this.type = type ? type.toLowerCase() : 'unknown';

    this.syncHandle = syncHandle;
    this._patch(data);
  }

  _patch(data) {
    /**
     * The ID of this interaction.
     * @type {Snowflake}
     * @readonly
     */
    this.id = data.id;

    /**
     * The token of this interaction.
     * @type {string}
     * @readonly
     */
    Object.defineProperty(this, 'token', { value: data.token });

    /**
     * The channel this interaction was sent in.
     * @type {?Channel}
     */
    this.channel = this.client.channels?.cache.get(data.channel_id) ?? null;

    /**
     * The guild this interaction was sent in, if any.
     * @type {?Guild}
     */
    this.guild = this.client.guilds?.cache.get(data.guild_id) ?? null;

    /**
     * If this interaction was sent in a guild, the member which sent it.
     * @type {?GuildMember}
     */
    this.member = this.guild?.members.add(data.member, false) ?? null;
  }

  /**
   * The timestamp the interaction was created at.
   * @type {number}
   * @readonly
   */
  get createdTimestamp() {
    return Snowflake.deconstruct(this.id).timestamp;
  }

  /**
   * The time the interaction was created at.
   * @type {Date}
   * @readonly
   */
  get createdAt() {
    return new Date(this.createdTimestamp);
  }

  /**
   * Whether the token has expired
   * @type {boolean}
   * @readonly
   */
  get expired() {
    return Date.now() >= this.createdTimestamp + 900000;
  }
}

module.exports = Interaction;
