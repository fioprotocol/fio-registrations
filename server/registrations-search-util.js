const db = require('./db/models');
const { Sequelize, sequelize } = db
const { Op } = Sequelize
const { trimKeys } = require('./db/helper')

async function saveRegistrationsSearchItem(params, where, logParams, tr = null, isNew = false) {
  try {
    // Updating RegistrationsSearch record
    const options = {}
    if (tr) {
      options.transaction = tr
    }
    if (isNew) {
      if (params.account_id) {
        const rsItem = await db.RegistrationsSearch.findOne({ where: { account_id: params.account_id, ap_type: params.ap_type || 'register' } }, options)
        if (rsItem && rsItem.id) return
      }
      await db.RegistrationsSearch.create(params, options)
    } else {
      options.where = where
      await db.RegistrationsSearch.update(params, options)
    }
    console.log(`${isNew ? 'Create' : 'Update'} RegistrationsSearch record success - ${JSON.stringify({ params, where, logParams })} === `);
  } catch (e) {
    console.log(`${isNew ? 'Create' : 'Update'} RegistrationsSearch record error - ${JSON.stringify({ params, where, logParams })}`);
    console.log(e);
  }
}

async function checkCreatedBcTrxEvents(accountIdsUpdatedTrxs, bcTrxIdsUpdatedEvents) {
  try {
    if (accountIdsUpdatedTrxs && accountIdsUpdatedTrxs.length) {
      for (const accountId of accountIdsUpdatedTrxs) {
        const [res] = await sequelize.query(
          `select max(t.id) from blockchain_trx t join blockchain_trx_event e on e.blockchain_trx_id = t.id where account_id = ${accountId}`
        )
        if (!res || !res.length || !res[0].max) continue
        const [bcTrxEvents] = await sequelize.query(
          `select id, trx_status from blockchain_trx_event where blockchain_trx_id = ${res[0].max} order by id DESC`
        )
        if (!bcTrxEvents || !bcTrxEvents.length) continue
        saveRegistrationsSearchItem(
          {
            blockchain_trx_id: res[0].max,
            blockchain_trx_event_id: bcTrxEvents[0].id,
            trx_status: bcTrxEvents[0].trx_status,
          },
          {
            account_id: accountId
          },
          {
            accountId,
            blockchain_trx_id: res,
            bcTrxEvents
          }
        )
      }
    }
    if (bcTrxIdsUpdatedEvents && bcTrxIdsUpdatedEvents.length) {
      for (const bcTrxId of bcTrxIdsUpdatedEvents) {
        const [bcTrxEvents] = await sequelize.query(
          `select id, trx_status from blockchain_trx_event where blockchain_trx_id = ${bcTrxId} order by id DESC`
        )
        if (!bcTrxEvents || !bcTrxEvents.length) continue
        saveRegistrationsSearchItem(
          {
            blockchain_trx_event_id: bcTrxEvents[0].id,
            trx_status: bcTrxEvents[0].trx_status,
          },
          {
            blockchain_trx_id: bcTrxId
          },
          {
            bcTrxId,
            bcTrxEvents
          }
        )
      }
    }
  } catch (e) {
    console.log(`checkCreatedBcTrxEvents error - ${JSON.stringify({ accountIdsUpdatedTrxs, bcTrxIdsUpdatedEvents })}`);
    console.log(e);
  }
}

/**
 * Fill RegistrationsSearch table by data
 *
 * @returns {Promise<void>}
 */
async function fillRegistrationsSearch() {
  console.log('fillRegistrationsSearch START === ');
  await db.RegistrationsSearch.destroy({
    where: {},
    truncate: true
  })

  const statuses = [
    'pending', 'success', 'expire', 'retry', 'review', 'cancel'
  ]

  for (const statusSearch of statuses) {
    const accountWhere = sequelize.literal(
      `(pay_status = '${statusSearch}' OR trx_status = '${statusSearch}')`
    )
    console.log(`fillRegistrationsSearch LOG - SEARCH STATUS (${statusSearch}) === `);
    const result = await getRegistrations(accountWhere, {})
    console.log(`fillRegistrationsSearch LOG - SEARCH STATUS RESULT AMOUNT (${statusSearch}: ${result.length}) === `);

    for (const resItem of result) {
      const trimmedItem = trimKeys(resItem)
      try {
        await db.RegistrationsSearch.create({
          account_id: trimmedItem.account_id,
          owner_key: trimmedItem.owner_key,
          address: trimmedItem.address,
          domain: trimmedItem.domain,
          pay_status: trimmedItem.pay_status,
          trx_status: trimmedItem.trx_status,
          extern_id: trimmedItem.extern_id,
          account_pay_id: trimmedItem['AccountPays.id'],
          account_pay_event_id: trimmedItem['AccountPayEvents.id'],
          blockchain_trx_id: trimmedItem.blockchain_trx_id,
          blockchain_trx_event_id: trimmedItem['BlockchainTrxEvents.id'],
          created: trimmedItem.created,
        })

        console.log(`fillRegistrationsSearch LOG - ITEM ADDED (${JSON.stringify({
          account_id: trimmedItem.account_id,
          pay_status: trimmedItem.pay_status,
          trx_status: trimmedItem.trx_status,
        })}) === `);
      } catch (e) {
        console.log('RegistrationsSearch create error === ');
        console.log(trimmedItem);
        console.log(e);
      }
    }
  }

  console.log('fillRegistrationsSearch FINISH === ');
}

/**
 *
 * @param accountWhere
 * @param accountPayWhere
 * @returns {Promise<any>}
 */
async function getRegistrations(accountWhere, accountPayWhere) {
  const result = await db.Account.findAll({
    raw: true,
    attributes: [['id', 'account_id'], 'address', 'domain', 'owner_key', 'created'],
    where: accountWhere,
    order: [['created', 'asc']],
    include: [
      {
        model: db.Wallet,
        attributes: [['name', 'wallet_name'], 'referral_code'],
        required: true
      },
      {
        model: db.AccountPay,
        attributes: [
          'pay_source', 'extern_id', 'forward_url',
          'buy_price', 'metadata', 'id'
        ],
        required: Object.keys(accountPayWhere).length !== 0,
        where: {
          id: {
            [Op.eq]: sequelize.literal(
              `( select max(p.id) from account_pay p ` +
              `join account_pay_event e on e.account_pay_id = p.id ` +
              `where account_id = "Account"."id" )`
            )
          },
          type: 'register',
          ...accountPayWhere,
        },
        include: [
          {
            model: db.AccountPayEvent,
            attributes: [
              ['created', 'pay_created'], 'pay_status', 'pay_status_notes',
              ['created_by', 'pay_created_by'], 'extern_status', 'extern_time',
              'confirmed_total', 'pending_total', 'metadata', 'id'
            ],
            where: {
              id: {
                [Op.eq]: sequelize.literal(
                  `( select max(id) from account_pay_event ` +
                  `where account_pay_id = "AccountPays"."id" )`
                )
              }
            }
          }
        ],
      },
      {
        model: db.BlockchainTrx,
        attributes: [
          ['type', 'blockchain_trx_type'], 'trx_id',
          'expiration', 'block_num'
        ],
        required: false,
        where: {
          type: 'register',
          id: {
            [Op.eq]: sequelize.literal(
              `( select max(t.id) from blockchain_trx t ` +
              `join blockchain_trx_event e on e.blockchain_trx_id = t.id ` +
              `where account_id = "Account"."id" )`
            )
          }
        },
        include: [
          {
            model: db.BlockchainTrxEvent,
            attributes: [
              ['created', 'trx_created'], 'trx_status',
              'trx_status_notes', 'blockchain_trx_id'
            ],
            where: {
              id: {
                [Op.eq]: sequelize.literal(
                  `( select max(id) from blockchain_trx_event ` +
                  `where blockchain_trx_id = "BlockchainTrxes"."id")`
                )
              }
            }
          }
        ]
      }
    ]
  })

  return result
}

/**
 * Search registrations
 *
 * @param accountWhere
 * @param accountPayWhere
 * @param limit
 * @param offset
 * @returns {Promise<{count: number, rows: any[]}>}
 */
async function getRegSearchRes(accountWhere, accountPayWhere, limit, offset) {
  const { rows, count } = await db.RegistrationsSearch.findAndCountAll({
    raw: true,
    limit,
    offset,
    attributes: ['account_id', 'address', 'domain', 'owner_key', 'created', 'extern_id', 'pay_status', 'trx_status'],
    where: {
      [Op.and]: [
        {
          ap_type: 'register',
        },
        accountWhere
      ]
    },
    order: [['created', 'asc']],
    include: [
      {
        model: db.Account,
        required: true,
        include: [
          {
            model: db.Wallet,
            attributes: [['name', 'wallet_name'], 'referral_code'],
            required: true
          },
        ]
      },
      {
        model: db.AccountPayEvent,
        attributes: [
          ['created', 'pay_created'], ['pay_status', 'pay_status_2'], 'pay_status_notes',
          ['created_by', 'pay_created_by'], 'extern_status', 'extern_time',
          'confirmed_total', 'pending_total', 'metadata', 'id'
        ],
        include: [
          {
            model: db.AccountPay,
            attributes: [
              'pay_source', 'forward_url',
              'buy_price', 'metadata', 'id'
            ],
            required: Object.keys(accountPayWhere).length !== 0,
            where: {
              type: 'register',
              ...accountPayWhere,
            }
          },
        ]
      },
      {
        model: db.BlockchainTrx,
        attributes: [
          ['type', 'blockchain_trx_type'], 'trx_id',
          'expiration', 'block_num'
        ],
        required: false,
        where: {
          type: 'register',
        }
      },
      {
        model: db.BlockchainTrxEvent,
        required: false,
        attributes: [
          ['created', 'trx_created'], ['trx_status', 'trx_status_2'],
          'trx_status_notes', 'blockchain_trx_id'
        ],
      }
    ]
  })

  return { rows: rows.map(r => trimKeys(r)), count }
}

module.exports = {
  fillRegistrationsSearch,
  checkCreatedBcTrxEvents,
  getRegSearchRes,
  saveRegistrationsSearchItem
}
