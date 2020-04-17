const db = require('./models')
const {sequelize} = db

async function history(publicKey, type = null) {
  const sumSelect1 =
    type === 'total' ? 'select sum(total) as total from (' :
    type === 'credits' ? 'select sum(total) as total, owner_key from (' :
    ''

  const sumSelect2 =
    type === 'total' ? `) balance` :
    type === 'credits' ? `) balance group by owner_key having sum(total) < 0` :
    ''

  const [result] = await sequelize.query(`
    ${sumSelect1}
    select -- payment
      coalesce(ape.extern_time, ape.created) as created,
      'payment' as type, ape.id as source_id, extern_id,
      coalesce(ape.confirmed_total * -1, 0.00) as total,
      coalesce(ape.pending_total * -1, 0.00) as pending,
      ape.created_by, coalesce(ape.extern_status, ap.pay_source) as notes,
      a.address, a.domain, a.owner_key
      --, ape.*
    from account a
    join account_pay ap on ap.account_id = a.id
    join account_pay_event ape on ape.account_pay_id = ap.id
    ${publicKey ? 'where a.owner_key = :publicKey' : ''}

    union all

    select -- "hold payment" / offset payment until registration or payment finality
      coalesce(ape.extern_time, ape.created) as created,
      'payment' as type, ape.id as source_id, extern_id,
      coalesce(ape.confirmed_total, 0.00) as total,
      coalesce(ape.pending_total, 0.00) as pending,
      ape.created_by, 'hold payment' as notes,
      a.address, a.domain, a.owner_key
      --, ape.*
    from account a
    join account_pay ap on ap.account_id = a.id
    join account_pay_event ape on ape.account_pay_id = ap.id
    where
      ${publicKey ? 'a.owner_key = :publicKey and' : ''}
      ape.confirmed_total is not null and
      not exists (
        select 1
        from blockchain_trx t
        join blockchain_trx_event e on e.blockchain_trx_id = t.id
        join blockchain_trx_event le on le.id = (
          select le.id
          from blockchain_trx lt
          join blockchain_trx_event le on le.blockchain_trx_id = lt.id
          where lt.account_id = t.account_id
          order by le.id desc limit 1
        )
        where
          t.account_id = a.id and
          (e.trx_status = 'success' or le.trx_status = 'cancel')
      ) and not exists (
        select 1
        from account_pay ja
        join account_pay_event je on je.account_pay_id = ja.id
        where ja.account_id = a.id and je.pay_status = 'cancel'
      )

    union all

    select
      created, 'adjustment' as type, adj.id as source_id, '' as extern_id,
      amount as total, cast(0.00 as numeric) as pending,
      created_by, notes, null as address, null as domain, owner_key
    from account_adj adj
    ${publicKey ? 'where owner_key = :publicKey' : ''}

    union all

    select
      coalesce(t.block_time, te.created),
      'registration' as type,
      te.id as source_id,
      trx_id as extern_id,
      case
        when te.trx_status = 'success' then ap.buy_price
        when te.trx_status = 'cancel' then 0.00
        else 0.00
      end as total,
      0.00 as pending,
      te.created_by, te.trx_status || coalesce(': ' || te.trx_status_notes, ''),
      a.address, a.domain, a.owner_key
      --, te.*
    from account a
    join account_pay ap on ap.id = (
      select id from account_pay
      where account_id = a.id
      order by id desc limit 1
    )
    join blockchain_trx t on t.account_id = a.id and t.type = 'register'
    join blockchain_trx_event te on te.blockchain_trx_id = t.id
    ${publicKey ? 'where a.owner_key = :publicKey' : ''}

    order by created, source_id, total asc, pending asc
    ${sumSelect2}`, {replacements: {publicKey}}
  )

  if(type === 'total') {
    return result[0]
  }

  if(type === 'credits') {
    return result
  }

  return result
}

module.exports = {
  history: publicKey => history(publicKey),
  balance: publicKey => history(publicKey, 'total'),
  credits: publicKey => history(null, 'credits'),
}
