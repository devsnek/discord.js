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

  /**
   * Options provided when sending a message in response to an interaction.
   * @typedef {Object} InteractionMessageOptions
   * @property {boolean} [tts=false] Whether or not the message should be spoken aloud
   * @property {string} [nonce=''] The nonce for the message
   * @property {string} [content=''] The content for the message
   * @property {MessageEmbed[]|Object[]} [embeds] The embeds for the message
   * (see [here](https://discord.com/developers/docs/resources/channel#embed-object) for more details)
   * @property {MessageMentionOptions} [allowedMentions] Which mentions should be parsed from the message content
   * @property {string|boolean} [code] Language for optional codeblock formatting to apply
   * @property {boolean|SplitOptions} [split=false] Whether or not the message should be split into multiple messages if
   * it exceeds the character limit. If an object is provided, these are the options for splitting the message
   * @property {boolean} [hideSource] Whether or not to hide the source interaction
   * @property {boolean} [ephemeral] Whether this message should be ephemeral
   */

  /**
   * Acknowledge this interaction without content.
   * @param {InteractionMessageOptions} [options] Options
   */
  async acknowledge(options = {}) {
    await this.syncHandle.acknowledge(options);
  }

  /**
   * Reply to this interaction.
   * @param {(StringResolvable | APIMessage)?} content The content for the message.
   * @param {(InteractionMessageOptions | MessageAdditions)?} options The options to provide.
   */
  async reply(content, options) {
    let apiMessage;

    if (content instanceof APIMessage) {
      apiMessage = content.resolveData();
    } else {
      apiMessage = APIMessage.create(this, content, options).resolveData();
      if (Array.isArray(apiMessage.data.content)) {
        throw new Error('Message is too long');
      }
    }

    const resolved = await apiMessage.resolveFiles();

    if (!this.syncHandle.reply(resolved)) {
      const clientID =
        this.client.interactionClient.clientID || (await this.client.api.oauth2.applications('@me').get()).id;

      await this.client.api.webhooks(clientID, this.token).post({
        auth: false,
        data: resolved.data,
        files: resolved.files,
      });
    }
  }
}

module.exports = Interaction;
