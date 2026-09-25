-- 한국 구글 인기 검색어 (가장 최근 집계일, 최신 주 기준)
WITH latest AS (
  SELECT MAX(refresh_date) AS d FROM `bigquery-public-data.google_trends.international_top_terms` WHERE country_code = 'KR'
)
SELECT term, MIN(rank) AS rank, ANY_VALUE(refresh_date) AS refresh_date, MAX(week) AS week
FROM `bigquery-public-data.google_trends.international_top_terms`, latest
WHERE country_code = 'KR' AND refresh_date = latest.d
  AND week = (SELECT MAX(week) FROM `bigquery-public-data.google_trends.international_top_terms`, latest WHERE country_code = 'KR' AND refresh_date = latest.d)
GROUP BY term
ORDER BY rank
