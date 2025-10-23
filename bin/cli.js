#!/usr/bin/env node

import('../lib/cli/index.cjs').then(({ run }) => {
  run();
}).catch(err => {
  console.error(err);
  process.exit(1);
});

