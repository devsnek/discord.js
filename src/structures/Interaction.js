'use strict';

const Base = require('./Base');
const User = require('./User');
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
     */
    this.type = InteractionType[data.type];

    /**
     * ID of this interaction.
     * @type {Snowflake}
     */
    this.id = data.id;

    /**
     * The token of this interaction.
     * @type {string}
     */
    this.token = data.token;

    /**
     * The application associated with this interaction.
     * @type {Snowflake}
     */
    this.applicationID = data.application_id;

    /**
     * The ID of the channel this interaction was sent in.
     * @type {?Snowflake}
     */
    this.channelID = data.channel_id;

    /**
     * The channel this interaction was sent in.
     * @type {?Channel}
     */
    this.channel = this.client.channels?.cache.get(data.channel_id) ?? null;

    /**
     * If this interaction was sent in a DM, the user which sent it.
     * @type {?User}
     */
    this.user = data.user ? this.client.users?.add(data.user, false) ?? new User(this.client, data.user) : null;

    /**
     * The ID of the guild this interaction was sent in, if any.
     * @type {?Snowflake}
     */
    this.guildID = data.guild_id;

    /**
     * The guild this interaction was sent in, if any.
     * @type {?Guild}
     */
    this.guild = this.client.guilds?.cache.get(data.guild_id) ?? null;

    /**
     * If this interaction was sent in a guild, the member which sent it.
     * @type {?GuildMember}
     */
    this.member = data.member ? this.guild?.members.add(data.member, false) : null;
  }
}

module.exports = Interaction;
