'use strict';

/**
 * human controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::human.human');
