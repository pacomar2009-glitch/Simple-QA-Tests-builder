
import { defineConfig } from '@playwright/test';

export default defineConfig({
  "testDir": "C:\\WARE-LOA\\ITprojects\\Tests-Analytics\\.local\\runs\\dcb670c0-298a-4493-b718-e853ee4188f2",
  "fullyParallel": false,
  "retries": 1,
  "workers": 1,
  "timeout": 30000,
  "use": {
    "trace": "on-first-retry",
    "screenshot": "only-on-failure",
    "video": "retain-on-failure"
  },
  "projects": [
    {
      "name": "chromium",
      "use": {
        "channel": "chrome"
      }
    }
  ]
});
