'use strict';

module.exports = {
  up: async QI => {
    return QI.sequelize.transaction( async t => {
      const btes = await QI.sequelize.query(`SELECT account_id, type FROM "blockchain_trx" bt
        JOIN blockchain_trx_event bte ON bte.blockchain_trx_id = bt.id
        WHERE bte.id = (
          SELECT max(sub_bte.id) over (partition by account_id) mid
            FROM blockchain_trx sub_bt
            LEFT OUTER JOIN blockchain_trx_event sub_bte ON sub_bte.blockchain_trx_id = sub_bt.id
            WHERE sub_bte.created > '04-28-2022' AND sub_bt.account_id = bt.account_id
            GROUP BY sub_bte.id, sub_bt.account_id, sub_bt.type
            ORDER BY sub_bte.id DESC
            LIMIT 1
        )
        AND bte.trx_status = 'review'
        AND bte.trx_status_notes = 'Insufficient funds to cover fee'
        AND bte.created > '04-28-2022'`
        , { transaction: t });

      const bts = []
      const accountIdByBts = {}
      for (const bteItem of btes[0]) {
        const btRes = await QI.sequelize.query(`
          INSERT INTO "blockchain_trx" (account_id, type) VALUES (${bteItem.account_id}, '${bteItem.type}') RETURNING id
        `, { transaction: t });
        bts.push(btRes[0][0].id)
        accountIdByBts[btRes[0][0].id] = bteItem.account_id
      }
      for (const btId of bts) {
        const bteRes = await QI.sequelize.query(`
          INSERT INTO "blockchain_trx_event" (blockchain_trx_id, trx_status, trx_status_notes) 
          VALUES (${btId}, 'retry', 'Retry insufficient funds trx errors') RETURNING id
        `, { transaction: t });

        await QI.sequelize.query(`
          UPDATE "registrations-search" SET blockchain_trx_id = ${btId}, 
          blockchain_trx_event_id = ${bteRes[0][0].id}, 
          trx_status = 'retry'
          WHERE account_id = ${accountIdByBts[btId]}
        `, { transaction: t });
      }
    });
  },

  down: async () => {
    //
  }
};
