CREATE TABLE IF NOT EXISTS financial_ratios (
  sector text,
  sub_sector text,
  industry text,
  sub_industry text,
  sector_code text,
  sub_sector_code text,
  industry_code text,
  sub_industry_code text,
  sub_name text,
  sub_code text,
  code text,
  stock_name text,
  sharia text,
  fs_date text,
  fiscal_year_end text,
  assets double precision,
  liabilities double precision,
  equity double precision,
  sales double precision,
  ebt double precision,
  profit_period double precision,
  profit_attr_owner double precision,
  eps double precision,
  audit text,
  opini text,
  book_value double precision,
  per double precision,
  price_bv double precision,
  de_ratio double precision,
  roa double precision,
  roe double precision,
  npm double precision
);

INSERT INTO financial_ratios (
  sector, sub_sector, industry, sub_industry, sector_code, sub_sector_code,
  industry_code, sub_industry_code, sub_name, sub_code, code, stock_name,
  sharia, fs_date, fiscal_year_end, assets, liabilities, equity, sales, ebt,
  profit_period, profit_attr_owner, eps, audit, opini, book_value, per,
  price_bv, de_ratio, roa, roe, npm
) VALUES (
  'Financials', 'Banks', 'Banks', 'Banks', 'G', 'G1',
  '', 'G111', 'Banks', 'G111', 'BBCA', 'Bank Central Asia Tbk.',
  'S', '2024-09-30', 'Dec', 1433701.78, 1169576.38, 255961.32, 72861.92, 50846.25,
  41087.89, 41073.86, 432.31, 'U', '', 2076.34, 22.38,
  4.66, 4.57, 3.7171, 20.8206, 73.1419
);
