'use strict';

const Base = require('./Base');
const { InteractionType } = require('../util/Constants');

/**
 * Represents an interaction, see {@link InteractionClient}.
 * @extends {Base}
 */
class Interaction extends Base {
  constructor(client, data) {
    super(client);

    /**
     * Type of this interaction.
     * @type {string}
     * @readonly
     */
    this.type = InteractionType[data.type];

    /**
     * ID of this interaction.
     * @type {Snowflake}
     * @readonly
     */
    this.id = data.id;

    /**
     * The token of this interaction.
     * @type {string}
     * @readonly
     */
    this.token = data.token;

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
}

module.exports = Interaction;
