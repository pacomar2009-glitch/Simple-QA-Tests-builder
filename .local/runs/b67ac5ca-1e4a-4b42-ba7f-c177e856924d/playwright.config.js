
import { defineConfig } from '@playwright/test';

export default defineConfig({
  "testDir": "C:\\WARE-LOA\\ITprojects\\Tests-Analytics\\.local\\runs\\b67ac5ca-1e4a-4b42-ba7f-c177e856924d",
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
