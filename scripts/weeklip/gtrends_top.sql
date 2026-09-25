WITH latest AS (
  SELECT MAX(refresh_date) AS d FROM `bigquery-public-data.google_trends.international_top_terms` WHERE country_code = 'KR'
)
SELECT term, MIN(rank) AS rank, ANY_VALUE(refresh_date) AS refresh_date, MAX(week) AS week
FROM `bigquery-public-data.google_trends.international_top_terms`, latest
WHERE country_code = 'KR' AND refresh_date = latest.d
  AND week = (SELECT MAX(week) FROM `bigquery-public-data.google_trends.international_top_terms`, latest WHERE country_code = 'KR' AND refresh_date = latest.d)
GROUP BY term
ORDER BY rank
