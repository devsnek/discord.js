const os = require('os');
const EventEmitter = require('events').EventEmitter;
const mergeDefault = require('../util/MergeDefault');
const Constants = require('../util/Constants');
const RESTManager = require('./rest/RESTManager');
const ClientDataManager = require('./ClientDataManager');
const ClientManager = require('./ClientManager');
const ClientDataResolver = require('./ClientDataResolver');
const ClientVoiceManager = require('./voice/ClientVoiceManager');
const WebSocketShardManager = require('./websocket/WebSocketShardManager');
const ActionsManager = require('./actions/ActionsManager');
const Collection = require('../util/Collection');
const Presence = require('../structures/Presence').Presence;
const ShardClientUtil = require('../sharding/ShardClientUtil');

/**
 * The main hub for interacting with the Discord API, and the starting point for any bot.
 * @extends {EventEmitter}
 */
class Client extends EventEmitter {
  /**
   * @param {ClientOptions} [options] Options for the client
   */
  constructor(options = {}) {
    super();

    // Obtain shard details from environment
    if (!options.shardID && 'SHARD_ID' in process.env) options.shardID = Number(process.env.SHARD_ID);
    if (!options.shardCount && 'SHARD_COUNT' in process.env) options.shardCount = Number(process.env.SHARD_COUNT);

    this._timeouts = new Set();
    this._intervals = new Set();

    /**
     * The options the client was instantiated with
     * @type {ClientOptions}
     */
    this.options = mergeDefault(Constants.DefaultOptions, options);
    this._validateOptions();

    /**
     * The REST manager of the client
     * @type {RESTManager}
     * @private
     */
    this.rest = new RESTManager(this);

    /**
     * The data manager of the Client
     * @type {ClientDataManager}
     * @private
     */
    this.dataManager = new ClientDataManager(this);

    /**
     * The manager of the Client
     * @type {ClientManager}
     * @private
     */
    this.manager = new ClientManager(this);

    /**
     * The WebSocket Manager of the Client
     * @type {WebSocketShardManager}
     * @private
     */
    this.ws = new WebSocketShardManager(this);

    /**
     * The Data Resolver of the Client
     * @type {ClientDataResolver}
     * @private
     */
    this.resolver = new ClientDataResolver(this);

    /**
     * The Action Manager of the Client
     * @type {ActionsManager}
     * @private
     */
    this.actions = new ActionsManager(this);

    /**
     * The Voice Manager of the Client (`null` in browsers)
     * @type {?ClientVoiceManager}
     * @private
     */
    this.voice = !this.browser ? new ClientVoiceManager(this) : null;

    /**
     * The shard helpers for the client
     * (only if the process was spawned as a child, such as from a {@link ShardingManager})
     * @type {?ShardClientUtil}
     */
    this.shard = process.send ? ShardClientUtil.singleton(this) : null;

    /**
     * All of the {@link User} objects that have been cached at any point, mapped by their IDs
     * @type {Collection<Snowflake, User>}
     */
    this.users = new Collection();

    /**
     * All of the guilds the client is currently handling, mapped by their IDs -
     * as long as sharding isn't being used, this will be *every* guild the bot is a member of
     * @type {Collection<Snowflake, Guild>}
     */
    this.guilds = new Collection();

    /**
     * All of the {@link Channel}s that the client is currently handling, mapped by their IDs -
     * as long as sharding isn't being used, this will be *every* channel in *every* guild, and all DM channels
     * @type {Collection<Snowflake, Channel>}
     */
    this.channels = new Collection();

    /**
     * Presences that have been received for the client user's friends, mapped by user IDs
     * <warn>This is only filled when using a user account.</warn>
     * @type {Collection<Snowflake, Presence>}
     */
    this.presences = new Collection();

    /**
     * Authorization token for the logged in user/bot
     * <warn>This should be kept private at all times.</warn>
     * @type {?string}
     */
    Object.defineProperty(this, 'token', {
      value: null,
      writable: true,
      configurable: true,
    });

    if (!this.token && 'CLIENT_TOKEN' in process.env) {
      this.token = process.env.CLIENT_TOKEN;
    } else {
      this.token = null;
    }

    /**
     * User that the client is logged in as
     * @type {?ClientUser}
     */
    this.user = null;

    /**
     * Time at which the client was last regarded as being in the `READY` state
     * (each time the client disconnects and successfully reconnects, this will be overwritten)
     * @type {?Date}
     */
    this.readyAt = null;

    if (this.options.messageSweepInterval > 0) {
      this.setInterval(this.sweepMessages.bind(this), this.options.messageSweepInterval * 1000);
    }
  }

  /**
   * How long it has been since the client last entered the `READY` state
   * @type {?number}
   * @readonly
   */
  get uptime() {
    return this.readyAt ? Date.now() - this.readyAt : null;
  }

  /**
   * All active voice connections that have been established, mapped by channel I
   * @type {Collection<string, VoiceConnection>}
   * @readonly
   */
  get voiceConnections() {
    if (this.browser) return new Collection();
    return this.voice.connections;
  }

  /**
   * All custom emojis that the client has access to, mapped by their IDs
   * @type {Collection<Snowflake, Emoji>}
   * @readonly
   */
  get emojis() {
    const emojis = new Collection();
    for (const guild of this.guilds.values()) {
      for (const emoji of guild.emojis.values()) emojis.set(emoji.id, emoji);
    }
    return emojis;
  }

  /**
   * Timestamp of the time the client was last `READY` at
   * @type {?number}
   * @readonly
   */
  get readyTimestamp() {
    return this.readyAt ? this.readyAt.getTime() : null;
  }

  /**
   * Whether the client is in a browser environment
   * @type {boolean}
   * @readonly
   */
  get browser() {
    return os.platform() === 'browser';
  }

  /**
   * Logs the client in, establishing a websocket connection to Discord.
   * <info>Both bot and regular user accounts are supported, but it is highly recommended to use a bot account whenever
   * possible. User accounts are subject to harsher ratelimits and other restrictions that don't apply to bot accounts.
   * Bot accounts also have access to many features that user accounts cannot utilise. User accounts that are found to
   * be abusing/overusing the API will be banned, locking you out of Discord entirely.</info>
   * @param {string} token Token of the account to log in with
   * @returns {Promise<string>} Token of the account used
   * @example
   * client.login('my token');
   */
  login(token) {
    return this.rest.methods.login(token);
  }

  /**
   * Logs out, terminates the connection to Discord, and destroys the client
   * @returns {Promise}
   */
  destroy() {
    for (const t of this._timeouts) clearTimeout(t);
    for (const i of this._intervals) clearInterval(i);
    this._timeouts.clear();
    this._intervals.clear();
    return this.manager.destroy();
  }

  /**
   * Obtains a user from Discord, or the user cache if it's already available.
   * <warn>This is only available when using a bot account.</warn>
   * @param {string} id ID of the user
   * @param {boolean} [cache=true] Whether to cache the new user object if it isn't already
   * @returns {Promise<User>}
   */
  fetchUser(id, cache = true) {
    if (this.users.has(id)) return Promise.resolve(this.users.get(id));
    return this.rest.methods.getUser(id, cache);
  }

  /**
   * Obtains an invite from Discord.
   * @param {InviteResolvable} invite Invite code or URL
   * @returns {Promise<Invite>}
   */
  fetchInvite(invite) {
    const code = this.resolver.resolveInviteCode(invite);
    return this.rest.methods.getInvite(code);
  }

  /**
   * Obtains a webhook from Discord.
   * @param {string} id ID of the webhook
   * @param {string} [token] Token for the webhook
   * @returns {Promise<Webhook>}
   */
  fetchWebhook(id, token) {
    return this.rest.methods.getWebhook(id, token);
  }

  /**
   * Obtains the available voice regions from Discord.
   * @returns {Collection<string, VoiceRegion>}
   */
  fetchVoiceRegions() {
    return this.rest.methods.fetchVoiceRegions();
  }

  /**
   * Sweeps all text-based channels' messages and removes the ones older than the max message lifetime.
   * If the message has been edited, the time of the edit is used rather than the time of the original message.
   * @param {number} [lifetime=this.options.messageCacheLifetime] Messages that are older than this (in seconds)
   * will be removed from the caches. The default is based on {@link ClientOptions#messageCacheLifetime}.
   * @returns {number} Amount of messages that were removed from the caches,
   * or -1 if the message cache lifetime is unlimited
   */
  sweepMessages(lifetime = this.options.messageCacheLifetime) {
    if (typeof lifetime !== 'number' || isNaN(lifetime)) throw new TypeError('The lifetime must be a number.');
    if (lifetime <= 0) {
      this.emit('debug', 'Didn\'t sweep messages - lifetime is unlimited');
      return -1;
    }

    const lifetimeMs = lifetime * 1000;
    const now = Date.now();
    let channels = 0;
    let messages = 0;

    for (const channel of this.channels.values()) {
      if (!channel.messages) continue;
      channels++;

      for (const message of channel.messages.values()) {
        if (now - (message.editedTimestamp || message.createdTimestamp) > lifetimeMs) {
          channel.messages.delete(message.id);
          messages++;
        }
      }
    }

    this.emit('debug', `Swept ${messages} messages older than ${lifetime} seconds in ${channels} text-based channels`);
    return messages;
  }

  /**
   * Obtains the OAuth Application of the bot from Discord.
   * <warn>This is only available when using a bot account.</warn>
   * @returns {Promise<ClientOAuth2Application>}
   */
  fetchApplication() {
    if (!this.user.bot) throw new Error(Constants.Errors.NO_BOT_ACCOUNT);
    return this.rest.methods.getMyApplication();
  }

  /**
   * Generates a link that can be used to invite the bot to a guild.
   * <warn>This is only available when using a bot account.</warn>
   * @param {PermissionResolvable[]|number} [permissions] Permissions to request
   * @returns {Promise<string>}
   * @example
   * client.generateInvite(['SEND_MESSAGES', 'MANAGE_GUILD', 'MENTION_EVERYONE'])
   *   .then(link => {
   *     console.log(`Generated bot invite link: ${link}`);
   *   });
   */
  generateInvite(permissions) {
    if (permissions) {
      if (permissions instanceof Array) permissions = this.resolver.resolvePermissions(permissions);
    } else {
      permissions = 0;
    }
    return this.fetchApplication().then(application =>
      `https://discordapp.com/oauth2/authorize?client_id=${application.id}&permissions=${permissions}&scope=bot`
    );
  }

  /**
   * Sets a timeout that will be automatically cancelled if the client is destroyed.
   * @param {Function} fn Function to execute
   * @param {number} delay Time to wait before executing (in milliseconds)
   * @param {...*} args Arguments for the function
   * @returns {Timeout}
   */
  setTimeout(fn, delay, ...args) {
    const timeout = setTimeout(() => {
      fn();
      this._timeouts.delete(timeout);
    }, delay, ...args);
    this._timeouts.add(timeout);
    return timeout;
  }

  /**
   * Clears a timeout
   * @param {Timeout} timeout Timeout to cancel
   */
  clearTimeout(timeout) {
    clearTimeout(timeout);
    this._timeouts.delete(timeout);
  }

  /**
   * Sets an interval that will be automatically cancelled if the client is destroyed.
   * @param {Function} fn Function to execute
   * @param {number} delay Time to wait before executing (in milliseconds)
   * @param {...*} args Arguments for the function
   * @returns {Timeout}
   */
  setInterval(fn, delay, ...args) {
    const interval = setInterval(fn, delay, ...args);
    this._intervals.add(interval);
    return interval;
  }

  /**
   * Clears an interval
   * @param {Timeout} interval Interval to cancel
   */
  clearInterval(interval) {
    clearInterval(interval);
    this._intervals.delete(interval);
  }

  /**
   * Adds/updates a friend's presence in {@link Client#presences}.
   * @param {string} id ID of the user
   * @param {Object} presence Raw presence object from Discord
   * @private
   */
  _setPresence(id, presence) {
    if (this.presences.has(id)) {
      this.presences.get(id).update(presence);
      return;
    }
    this.presences.set(id, new Presence(presence));
  }

  /**
   * Calls `eval(script)` with the client as `this`.
   * @param {string} script Script to eval
   * @returns {*}
   * @private
   */
  _eval(script) {
    return eval(script);
  }

  /**
   * Validates client options
   * @param {ClientOptions} [options=this.options] Options to validate
   * @private
   */
  _validateOptions(options = this.options) {
    if (options.shardCount !== 'auto' && (typeof options.shardCount !== 'number' || isNaN(options.shardCount))) {
      throw new TypeError('The shardCount option must be a number or `auto`.');
    }
    if (typeof options.shardID !== 'number' || isNaN(options.shardID)) {
      throw new TypeError('The shardID option must be a number.');
    }
    if (options.shardCount < 0) throw new RangeError('The shardCount option must be at least 0.');
    if (options.shardID < 0) throw new RangeError('The shardID option must be at least 0.');
    if (options.shardID !== 0 && options.shardID >= options.shardCount) {
      throw new RangeError('The shardID option must be less than shardCount.');
    }
    if (typeof options.messageCacheMaxSize !== 'number' || isNaN(options.messageCacheMaxSize)) {
      throw new TypeError('The messageCacheMaxSize option must be a number.');
    }
    if (typeof options.messageCacheLifetime !== 'number' || isNaN(options.messageCacheLifetime)) {
      throw new TypeError('The messageCacheLifetime option must be a number.');
    }
    if (typeof options.messageSweepInterval !== 'number' || isNaN(options.messageSweepInterval)) {
      throw new TypeError('The messageSweepInterval option must be a number.');
    }
    if (typeof options.fetchAllMembers !== 'boolean') {
      throw new TypeError('The fetchAllMembers option must be a boolean.');
    }
    if (typeof options.disableEveryone !== 'boolean') {
      throw new TypeError('The disableEveryone option must be a boolean.');
    }
    if (typeof options.restWsBridgeTimeout !== 'number' || isNaN(options.restWsBridgeTimeout)) {
      throw new TypeError('The restWsBridgeTimeout option must be a number.');
    }
    if (!(options.disabledEvents instanceof Array)) throw new TypeError('The disabledEvents option must be an Array.');
  }
}

module.exports = Client;

/**
 * Emitted for general warnings
 * @event Client#warn
 * @param {string} info The warning
 */

/**
 * Emitted for general debugging information
 * @event Client#debug
 * @param {string} info The debug information
 */
