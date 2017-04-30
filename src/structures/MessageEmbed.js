/**
 * Represents an embed in a message (image/video preview, rich embed, etc.)
 */
class MessageEmbed {
  constructor(message, data) {
    /**
     * The client that instantiated this embed
     * @name MessageEmbed#client
     * @type {Client}
     * @readonly
     */
    Object.defineProperty(this, 'client', { value: message.client });

    /**
     * The message this embed is part of
     * @type {Message}
     */
    this.message = message;

    this.setup(data);
  }

  setup(data) { // eslint-disable-line complexity
    /**
     * The type of this embed
     * @type {string}
     */
    this.type = data.type;

    /**
     * The title of this embed
     * @type {?string}
     */
    this.title = data.title || null;

    /**
     * The description of this embed
     * @type {?string}
     */
    this.description = data.description || null;

    /**
     * The URL of this embed
     * @type {?string}
     */
    this.url = data.url || null;

    /**
     * The color of the embed
     * @type {?number}
     */
    this.color = data.color || null;

    /**
     * The timestamp of this embed
     * @type {?number}
     */
    this.timestamp = new Date(data.timestamp) || null;

    /**
     * The fields of this embed
     * @type {?Object[]}
     * @property {string} name The name of this field
     * @property {string} value The value of this field
     * @property {boolean} inline If this field will be displayed inline
     */
    this.fields = data.fields || null;

    /**
     * The thumbnail of this embed, if there is one
     * @type {?Object}
     * @property {string} url URL for this thumbnail
     * @property {string} proxyURL ProxyURL for this thumbnail
     * @property {number} height Height of this thumbnail
     * @property {number} width Width of this thumbnail
     */
    this.thumbnail = data.thumbnail ? {
      url: data.thumbnail.url || null,
      proxyURL: data.thumbnail.proxy_url,
      height: data.height,
      width: data.width,
    } : null;

    /**
     * The image of this embed, if there is one
     * @type {?Object}
     * @property {string} url URL for this image
     * @property {string} proxyURL ProxyURL for this image
     * @property {number} height Height of this image
     * @property {number} width Width of this image
     */
    this.image = data.image ? {
      url: data.image.url || null,
      proxyURL: data.image.proxy_url,
      height: data.height,
      width: data.width,
    } : null;

    /**
     * The video of this embed, if there is one
     * @type {?Object}
     * @property {string} url URL of this video
     * @property {number} height Height of this video
     * @property {number} width Width of this video
     */
    this.video = data.video ? {
      url: data.video.url || null,
      height: data.video.height,
      width: data.video.width,
    } : null;

    /**
     * The author of this embed, if there is one
     * @type {?Object}
     * @property {string} name The name of this author
     * @property {string} url URL of this author
     * @property {string} iconURL URL of the icon for this author
     * @property {string} proxyIconURL Proxied URL of the icon for this author
     */
    this.author = data.author ? {
      name: data.author.name || null,
      url: data.author.url || null,
      iconURL: data.author.iconURL || data.author.icon_url || null,
      proxyIconURL: data.author.proxyIconUrl || data.author.proxy_icon_url || null,
    } : null;

    /**
     * The provider of this embed, if there is one
     * @type {?Object}
     * @property {string} name The name of this provider
     * @property {string} url URL of this provider
     */
    this.provider = data.provider ? {
      name: data.provider.name,
      url: data.provider.url,
    } : null;

    /**
     * The footer of this embed
     * @type {?Object}
     * @property {string} text The text of this footer
     * @property {string} iconURL URL of the icon for this footer
     * @property {string} proxyIconURL Proxied URL of the icon for this footer
     */
    this.footer = data.footer ? {
      text: data.footer.text || null,
      iconURL: data.footer.iconURL || data.footer.icon_url || null,
      proxyIconURL: data.footer.proxyIconURL || data.footer.proxy_icon_url || null,
    } : null;
  }

  /**
   * The date this embed was created
   * @type {Date}
   * @readonly
   */
  get createdAt() {
    return new Date(this.timestamp);
  }

  /**
   * The hexadecimal version of the embed color, with a leading hash
   * @type {string}
   * @readonly
   */
  get hexColor() {
    let col = this.color.toString(16);
    while (col.length < 6) col = `0${col}`;
    return `#${col}`;
  }

  /**
   * Adds a field to the embed (max 25).
   * @param {StringResolvable} name The name of the field
   * @param {StringResolvable} value The value of the field
   * @param {boolean} [inline=false] Set the field to display inline
   * @returns {MessageEmbed} This embed
   */
  addField(name, value, inline = false) {
    if (this.fields.length >= 25) throw new RangeError('MessageEmbeds may not exceed 25 fields.');
    name = resolveString(name);
    if (name.length > 256) throw new RangeError('MessageEmbed field names may not exceed 256 characters.');
    if (!/\S/.test(name)) throw new RangeError('MessageEmbed field names may not be empty.');
    value = resolveString(value);
    if (value.length > 1024) throw new RangeError('MessageEmbed field values may not exceed 1024 characters.');
    if (!/\S/.test(value)) throw new RangeError('MessageEmbed field values may not be empty.');
    this.fields.push({ name, value, inline });
    return this;
  }

  /**
   * Sets the file to upload alongside the embed. This file can be accessed via `attachment://fileName.extension` when
   * setting an embed image or author/footer icons. Only one file may be attached.
   * @param {FileOptions|string} file Local path or URL to the file to attach, or valid FileOptions for a file to attach
   * @returns {MessageEmbed} This embed
   */
  attachFile(file) {
    if (this.file) throw new RangeError('You may not upload more than one file at once.');
    this.file = file;
    return this;
  }

  /**
   * Sets the author of this embed.
   * @param {StringResolvable} name The name of the author
   * @param {string} [iconURL] The icon URL of the author
   * @param {string} [url] The URL of the author
   * @returns {MessageEmbed} This embed
   */
  setAuthor(name, iconURL, url) {
    this.author = { name: resolveString(name), iconURL, url };
    return this;
  }

  /**
   * Sets the color of this embed.
   * @param {ColorResolvable} color The color of the embed
   * @returns {MessageEmbed} This embed
   */
  setColor(color) {
    this.color = this.client.resolver.resolveColor(color);
    return this;
  }

  /**
   * Sets the description of this embed.
   * @param {StringResolvable} description The description
   * @returns {MessageEmbed} This embed
   */
  setDescription(description) {
    description = resolveString(description);
    if (description.length > 2048) throw new RangeError('MessageEmbed descriptions may not exceed 2048 characters.');
    this.description = description;
    return this;
  }

  /**
   * Sets the footer of this embed.
   * @param {StringResolvable} text The text of the footer
   * @param {string} [iconURL] The icon URL of the footer
   * @returns {MessageEmbed} This embed
   */
  setFooter(text, iconURL) {
    text = resolveString(text);
    if (text.length > 2048) throw new RangeError('MessageEmbed footer text may not exceed 2048 characters.');
    this.footer = { text, iconURL };
    return this;
  }

  /**
   * Set the image of this embed.
   * @param {string} url The URL of the image
   * @returns {MessageEmbed} This embed
   */
  setImage(url) {
    this.image = { url };
    return this;
  }

  /**
   * Set the thumbnail of this embed.
   * @param {string} url The URL of the thumbnail
   * @returns {MessageEmbed} This embed
   */
  setThumbnail(url) {
    this.thumbnail = { url };
    return this;
  }

  /**
   * Sets the timestamp of this embed.
   * @param {Date} [timestamp=current date] The timestamp
   * @returns {MessageEmbed} This embed
   */
  setTimestamp(timestamp = new Date()) {
    this.timestamp = timestamp;
    return this;
  }

  /**
   * Sets the title of this embed.
   * @param {StringResolvable} title The title
   * @returns {MessageEmbed} This embed
   */
  setTitle(title) {
    title = resolveString(title);
    if (title.length > 256) throw new RangeError('MessageEmbed titles may not exceed 256 characters.');
    this.title = title;
    return this;
  }

  /**
   * Sets the URL of this embed.
   * @param {string} url The URL
   * @returns {MessageEmbed} This embed
   */
  setURL(url) {
    this.url = url;
    return this;
  }

  /**
   * Create an object that can be sent in a message to discord.
   * @returns {Object}
   * @private
   */
  _transformForDiscord() {
    return {
      type: 'rich',
      title: this.title || null,
      description: this.description || null,
      url: this.url || null,
      color: this.color || null,
      fields: this.fields ? this.fields : null,
      timestamp: this.timestamp || null,
      thumbnail: this.thumbnail ? { url: this.thumbnail.url || null } : null,
      image: this.image ? { url: this.image.url || null } : null,
      video: this.video ? { url: this.video.url || null } : null,
      author: this.author ? {
        name: this.author.name || null,
        url: this.author.url || null,
        icon_url: this.author.iconURL || null,
      } : null,
      footer: this.footer ? {
        text: this.footer.text || null,
        icon_url: this.footer.iconURL || null,
      } : null,
    };
  }
}

function resolveString(data) {
  if (typeof data === 'string') return data;
  if (data instanceof Array) return data.join('\n');
  return String(data);
}

module.exports = MessageEmbed;
