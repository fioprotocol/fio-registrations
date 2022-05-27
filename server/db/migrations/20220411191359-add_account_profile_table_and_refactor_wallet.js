'use strict';

require('dotenv').config({
    path: require('path').resolve(process.cwd(), '.env-server')
});

const Sequelize = require("sequelize");
const {Fio, Ecc} = require("@fioprotocol/fiojs");
const {PrivateKey} = Ecc;

const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;

const walletPublicKey = PrivateKey(walletPrivateKey).toPublic().toString('FIO');

const defaultActor = Fio.accountHash(walletPublicKey);
const defaultPermission = 'active';

module.exports = {
  up: async (QI, DT) => {
      return QI.sequelize.transaction( async t => {
          await QI.createTable('account_profile',
              {
                  id: {
                      type: DT.INTEGER,
                      primaryKey: true,
                      autoIncrement: true,
                      allowNull: false
                  },
                  actor: {
                      type: DT.STRING,
                      allowNull: false,
                  },
                  permission: {
                      type: DT.STRING,
                      allowNull: false
                  },
                  name: {
                      type: DT.STRING,
                      allowNull: true
                  },
                  is_default: {
                      type: DT.BOOLEAN,
                      allowNull: false,
                      defaultValue: false
                  },
                  created_at: {
                      type: DT.DATE,
                      defaultValue: Sequelize.fn('now'),
                      allowNull: false
                  },
                  updated_at: {
                      type: DT.DATE,
                      defaultValue: Sequelize.fn('now'),
                      allowNull: false
                  },
                  deleted_at: { type: DT.DATE },
              },
              { transaction: t }
          );

          await QI.addColumn('wallet', 'account_profile_id', {
              type: DT.INTEGER,
              references: {
                  model: 'account_profile',
                  key: 'id'
              },
              onUpdate: 'cascade',
              onDelete: 'set null',
              allowNull: true,
              defaultValue: null
          },
          {transaction: t});

          await QI.sequelize.query(`INSERT INTO public.account_profile ( actor, permission, is_default ) VALUES ('${defaultActor}', '${defaultPermission}', TRUE)`, {transaction: t});
          await QI.sequelize.query(`INSERT INTO public.account_profile ( actor, permission ) SELECT actor, permission FROM public.wallet WHERE actor <> '' GROUP BY actor, permission;`, {transaction: t});
          await QI.sequelize.query(`UPDATE public.wallet SET account_profile_id = public.account_profile.id FROM public.account_profile WHERE public.account_profile.actor = public.wallet.actor AND public.account_profile.permission = public.wallet.permission;`, {transaction: t});
          await QI.sequelize.query(`UPDATE public.wallet SET account_profile_id = 1 WHERE public.wallet.account_profile_id IS NULL;`, {transaction: t});
          await QI.removeColumn('wallet', 'actor', {transaction: t});
          await QI.removeColumn('wallet', 'permission', {transaction: t});
      });
  },

  down: async (QI, DT) => {
      return QI.sequelize.transaction( async t => {
          await QI.addColumn('wallet', 'actor', {
              type: DT.STRING,
              allowNull: false,
              defaultValue: ''
          }, {transaction: t});
          await QI.addColumn('wallet', 'permission', {
              type: DT.STRING,
              allowNull: false,
              defaultValue: ''
          }, {transaction: t});

          await QI.sequelize.query(`UPDATE public.wallet SET actor = public.account_profile.actor, permission = public.account_profile.permission FROM public.account_profile WHERE public.account_profile.id = public.wallet.account_profile_id;`, {transaction: t})

          await QI.removeColumn('wallet', 'account_profile_id', {transaction: t});
          return QI.dropTable('actor', {transaction: t});
      })
  }
};
