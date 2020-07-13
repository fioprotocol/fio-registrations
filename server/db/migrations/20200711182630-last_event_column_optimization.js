'use strict';

module.exports = {
  up: async (QI, DT) => {
    await QI.addColumn('account_pay', 'last_pay_event', {
      type: DT.INTEGER,
      allowNull: true,
      comment: 'Optimize lookup of last event.'
    })

    await QI.addConstraint('account_pay', ['last_pay_event'], {
      type: 'FOREIGN KEY',
      name: 'account_pay_account_pay_event_last_pay_event_fkey',
      references: { table: 'account_pay_event', field: 'id' }
    })

    await QI.addColumn('blockchain_trx', 'last_trx_event', {
      type: DT.INTEGER,
      allowNull: true,
      comment: 'Optimize lookup of last event.'
    })

    await QI.addConstraint('blockchain_trx', ['last_trx_event'], {
      type: 'FOREIGN KEY',
      name: 'blockchain_trx_blockchain_trx_event_last_trx_event_fkey',
      references: { table: 'blockchain_trx_event', field: 'id' }
    })

    await QI.sequelize.query(
      `CREATE FUNCTION account_last_pay_event_insert_trigger_function()
      RETURNS trigger AS $$
      BEGIN
        UPDATE account_pay SET last_pay_event = NEW.ID
        WHERE id = NEW.account_pay_id;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql`
    )

    await QI.sequelize.query(
      `CREATE TRIGGER account_last_pay_event_insert_trigger
      AFTER INSERT
      ON account_pay_event
      FOR EACH ROW
      EXECUTE PROCEDURE account_last_pay_event_insert_trigger_function()`
    )

    await QI.sequelize.query(
      `CREATE FUNCTION blockchain_last_trx_event_insert_trigger_function()
      RETURNS trigger AS $$
      BEGIN
        UPDATE blockchain_trx SET last_trx_event = NEW.ID
        WHERE id = NEW.blockchain_trx_id;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql`
    )

    await QI.sequelize.query(
      `CREATE TRIGGER blockchain_last_trx_event_insert_trigger
      AFTER INSERT
      ON blockchain_trx_event
      FOR EACH ROW
      EXECUTE PROCEDURE blockchain_last_trx_event_insert_trigger_function()`
    )

    await QI.sequelize.query(
      `update account_pay ap set last_pay_event = (
        select max(le.id)
        from account_pay_event le
        where le.account_pay_id = ap.id
      )`
    )

    await QI.sequelize.query(
      `update blockchain_trx t set last_trx_event = (
        select max(le.id)
        from blockchain_trx_event le
        where le.blockchain_trx_id = t.id
      )`
    )
  },

  down: async (QI/*, DT*/) => {
    await QI.sequelize.query(
      `DROP TRIGGER account_last_pay_event_insert_trigger ON account_pay_event`
    )

    await QI.sequelize.query(
      `DROP FUNCTION account_last_pay_event_insert_trigger_function()`
    )

    await QI.sequelize.query(
      `DROP TRIGGER blockchain_last_trx_event_insert_trigger ON blockchain_trx_event`
    )

    await QI.sequelize.query(
      `DROP FUNCTION blockchain_last_trx_event_insert_trigger_function()`
    )

    await QI.removeConstraint('account_pay', 'account_pay_account_pay_event_last_pay_event_fkey')
    await QI.removeColumn('account_pay', 'last_pay_event');

    await QI.removeConstraint('blockchain_trx', 'blockchain_trx_blockchain_trx_event_last_trx_event_fkey')
    await QI.removeColumn('blockchain_trx', 'last_trx_event')
  }
};
