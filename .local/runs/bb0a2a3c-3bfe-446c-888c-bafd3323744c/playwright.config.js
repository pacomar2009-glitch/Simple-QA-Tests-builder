
import { defineConfig } from '@playwright/test';

export default defineConfig({
  "testDir": "C:\\WARE-LOA\\ITprojects\\Tests-Analytics\\.local\\runs\\bb0a2a3c-3bfe-446c-888c-bafd3323744c",
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
