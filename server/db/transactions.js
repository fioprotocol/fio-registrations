const db = require('./models')
const {sequelize} = db

async function history(publicKey, type = null, options = {}) {
  options.replacements = {publicKey}

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

    select -- "hold" until registration starts or payment expires
      coalesce(ae.extern_time, ae.created) as created,
      'payment' as type, ae.id as source_id, extern_id,
      coalesce(ap.buy_price, 0.00) as total,
      0.00 as pending,
      ae.created_by, 'hold' as notes,
      a.address, a.domain, a.owner_key
      --, ape.*
    from account a
    join account_pay ap on ap.account_id = a.id
    join account_pay_event ae on ae.id = ap.last_pay_event
    where
      ${publicKey ? 'a.owner_key = :publicKey and' : ''}
      not exists (
        select 1
        from blockchain_trx t
        join blockchain_trx_event e on e.blockchain_trx_id = t.id
        where t.account_id = a.id
      ) and not exists ( -- has any pending payments
        select 1
        from account_pay ap
        join account_pay_event ae on ae.id = ap.last_pay_event
        where ap.account_id = a.id and ae.pay_status = 'cancel'
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
      t.trx_id as extern_id,
      case -- offset payments and adjustments until reg success or cancel
        when te.id = le.id and te.trx_status = 'success' then ap.buy_price
        when te.id = le.id and te.trx_status = 'cancel' then 0.00
        when t.id = l.id and te.id = le.id and bt.hassuccess is not null and te.trx_status = 'review' then 0.00
        when t.id = l.id and te.id = le.id then ap.buy_price -- hold at every last step unless success or cancel
        else 0.00 -- prior steps do not create a hold (hold only once)
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
    join blockchain_trx l on l.id = (
        select id from blockchain_trx
        where account_id = a.id and type = 'register'
        order by id desc limit 1
      )
    join blockchain_trx_event te on te.blockchain_trx_id = t.id
    join blockchain_trx_event le on le.id = t.last_trx_event
    left join (
        select bt.account_id, 1 as hassuccess
        from blockchain_trx bt
        join blockchain_trx_event be on be.id = bt.last_trx_event
        where be.trx_status = 'success' and bt.type = 'register'
        limit 1
      ) as bt on bt.account_id = a.id
    ${publicKey ? 'where a.owner_key = :publicKey' : ''}

    order by created, source_id, total asc, pending asc
    ${sumSelect2}`, options
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
  history: (publicKey, options) => history(publicKey, null, options),
  balance: (publicKey, options) => history(publicKey, 'total', options),
  credits: (publicKey, options) => history(null, 'credits', options),
}
