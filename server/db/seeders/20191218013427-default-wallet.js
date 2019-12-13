'use strict';

const bcrypt = require('bcryptjs')
const db = require('../models')
const Isemail = require('isemail')
const fs = require('fs')
const {resolve} = require('path')
const {checkEncrypt} = require('../../encryption-check')

const defaultUser = JSON.parse(process.env.DEFAULT_USER)

if(defaultUser.password === '') {
  throw new Error(`Add a password to DEFAULT_USER (./.env-server)`)
}

if(defaultUser.username === '') {
  throw new Error(`Add a username to DEFAULT_USER (./.env-server)`)
}

if(!Isemail.validate(defaultUser.email)) {
  throw new Error(`Invalid DEFAULT_USER email`)
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    defaultUser.password = checkEncrypt(
      process.env.DATABASE_ENCRYPT_SECRET,
      await bcrypt.hash(defaultUser.password, bcrypt.genSaltSync())
    )

    defaultUser.email = defaultUser.email.toLowerCase()

    await queryInterface.sequelize.transaction(async transaction => {
      const user = await db.User.create(defaultUser, {transaction})
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.bulkDelete('user', {email: defaultUser.email}, {transaction});
    })
  }
};
