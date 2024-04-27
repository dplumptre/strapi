'use strict';

/**
 * human service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::human.human');
