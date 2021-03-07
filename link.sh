#!/bin/sh
#
# Run with sudo for development purposes
#

cd clusterduck
npm link --unsafe-perm
cd -

cd clusterduck-redis
npm link --unsafe-perm
cd -
cd clusterduck
npm link clusterduck-redis --unsafe-perm
cd -

cd clusterduck-redis
npm link clusterduck --unsafe-perm
cd -
