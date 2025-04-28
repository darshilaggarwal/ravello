const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('./logger');

/**
 * Send email using nodemailer
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Email body
 * @returns {Promise} - Nodemailer sendMail promise
 */
const sendEmail = async (options) => {
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    auth: {
      user: config.email.user,
      pass: config.email.pass
    }
  });

  // Define email options
  const mailOptions = {
    from: `Revello <${config.email.user}>`,
    to: options.email,
    subject: options.subject,
    text: options.message
  };

  // Send email
  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email error: ${error.message}`);
    throw error;
  }
};

module.exports = sendEmail; 