ALTER TABLE records DROP CONSTRAINT IF EXISTS records_origin_check;
ALTER TABLE records ADD CONSTRAINT records_origin_check
 CHECK(origin IN ('manual','reference','public_html','gsc','csv','webhook','automatic'));
