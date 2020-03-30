

# Upgrading from 0.1.0 to 0.2.0

```sql
DROP INDEX account_address_domain;
DROP INDEX account_domain;

CREATE UNIQUE INDEX account_address_domain_owner_key
  ON public.account
  USING btree
  (address COLLATE pg_catalog."default", domain COLLATE pg_catalog."default", owner_key COLLATE pg_catalog."default");

CREATE UNIQUE INDEX account_domain_owner_key
  ON public.account
  USING btree
  (domain COLLATE pg_catalog."default", owner_key COLLATE pg_catalog."default");
```
