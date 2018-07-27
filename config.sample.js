const config = {
  /**
   * Enter hostname with proto for your app
   * You can use domain without SSL-certificate
   */
  host: 'https://notifier.example.com',

  /**
   * Set port for this server
   * Need to have nginx or any other proxy from 443 (https) to 3000 (your port)
   */
  port: 3000,

  /**
   * Set password for encrypting identifiers
   */
  password: 'my_secret_password',

  /**
   * Telegram Bot token
   */
  token: '12345678:AAAbbbcccddd',
};

module.exports = config;
