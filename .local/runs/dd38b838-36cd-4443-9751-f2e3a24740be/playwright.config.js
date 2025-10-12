
import { defineConfig } from '@playwright/test';

export default defineConfig({
  "testDir": "C:\\WARE-LOA\\ITprojects\\Tests-Analytics\\.local\\runs\\dd38b838-36cd-4443-9751-f2e3a24740be",
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
