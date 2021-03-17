'use strict';

const APIMessage = require('./APIMessage');
const Interaction = require('./Interaction');
const Channel = require('../structures/Channel');
const Role = require('../structures/Role');
const User = require('../structures/User');
const { ApplicationCommandOptionType } = require('../util/Constants');
const Snowflake = require('../util/Snowflake');

/**
 * Represents a command interaction, see {@link InteractionClient}.
 * @extends {Interaction}
 */
class CommandInteraction extends Interaction {
  constructor(client, data, syncHandle) {
    super(client, data);

    this.syncHandle = syncHandle;

    /**
     * The ID of the invoked command.
     * @type {Snowflake}
     */
    this.commandID = data.data.id;

    /**
     * The name of the invoked command.
     * @type {string}
     */
    this.commandName = data.data.name;

    const map = o => {
      switch (o.type) {
        case ApplicationCommandOptionType.SUB_COMMAND:
          return {
            name: o.name,
            type: ApplicationCommandOptionType[o.type],
            options: o.options.map(map),
          };
        case ApplicationCommandOptionType.SUB_COMMAND_GROUP:
          return {
            name: o.name,
            type: ApplicationCommandOptionType[o.type],
            options: o.options.map(map),
          };
        case ApplicationCommandOptionType.STRING:
          return {
            name: o.name,
            type: ApplicationCommandOptionType[o.type],
            value: o.value,
          };
        case ApplicationCommandOptionType.INTEGER:
          return {
            name: o.name,
            type: ApplicationCommandOptionType[o.type],
            value: o.value,
          };
        case ApplicationCommandOptionType.BOOLEAN:
          return {
            name: o.name,
            type: ApplicationCommandOptionType[o.type],
            value: o.value,
          };
        case ApplicationCommandOptionType.USER: {
          const rawUser = data.data.resolved.users[o.value];
          const rawMember = data.data.resolved.members[o.value];
          if (rawMember) {
            rawMember.user = rawUser;
          }
          return {
            name: o.name,
            type: ApplicationCommandOptionType[o.type],
            user: this.client.users ? this.client.users.add(rawUser, false) : new User(this.client, rawUser),
            member: rawMember ? this.guild?.members.add(rawMember, false) ?? null : null,
          };
        }
        case ApplicationCommandOptionType.CHANNEL: {
          const raw = data.data.resolved.channels[o.value];
          return {
            name: o.name,
            type: ApplicationCommandOptionType[o.type],
            channel: this.client.channels
              ? this.client.channels.add(raw, false)
              : Channel.create(this.client, raw, this.guild),
          };
        }
        case ApplicationCommandOptionType.ROLE: {
          const raw = data.data.resolved.roles[o.value];
          return {
            name: o.name,
            type: ApplicationCommandOptionType[o.type],
            role: this.guild ? this.guild.roles.add(raw, false) : new Role(this.client, raw, undefined),
          };
        }
        default:
          return o;
      }
    };
    /**
     * The options passed to the command.
     * @type {Object}
     */
    this.options = data.data.options.map(map);
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
   * Reply to this interaction.
   * @param {(StringResolvable | APIMessage)?} content The content for the message.
   * @param {(MessageOptions | MessageAdditions)?} options The options to provide.
   */
  async reply(content, options) {
    let apiMessage;

    if (content instanceof APIMessage) {
      apiMessage = content.resolveData();
    } else {
      apiMessage = APIMessage.create(this, content, options).resolveData();
    }

    const resolved = await apiMessage.resolveFiles();

    if (!this.syncHandle.reply(resolved)) {
      await this.client.api.webhooks(this.applicationID, this.token).post({
        auth: false,
        data: resolved.data,
        files: resolved.files,
        query: { wait: true },
      });
    }
  }
}

module.exports = CommandInteraction;
