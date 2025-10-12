
import { defineConfig } from '@playwright/test';

export default defineConfig({
  "testDir": "C:\\WARE-LOA\\ITprojects\\Tests-Analytics\\.local\\runs\\4b1708cd-c20d-4e8f-90b2-575f932fdb5d",
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
