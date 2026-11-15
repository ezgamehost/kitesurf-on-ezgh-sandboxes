#!/bin/sh
# The sandbox's start command. A start command's output isn't returned, so it goes to a file:
#   ezgh sandboxes exec kitesurf -- cat /tmp/kitesurf.log
exec node /app/serve.mjs >>/tmp/kitesurf.log 2>&1
