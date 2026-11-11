import { crawlPage } from "../server/crawl";
import { SITES } from "../src/lib/demo/sites";
import { pool } from "../server/db";
try {
  for (const site of SITES) {
    const result = await crawlPage(site.url + "/", null);
    console.log(`${site.host} · HTTP ${result.status} · relevé public stocké`);
  }
} finally {
  await pool.end();
}
