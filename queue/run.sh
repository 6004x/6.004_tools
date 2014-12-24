#!/bin/sh
sudo k5start -qtFPU -f /etc/apache2/keytab -- /usr/bin/node queue.js
