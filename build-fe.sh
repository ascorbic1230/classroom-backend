#! /usr/bin/bash

git clone https://github.com/ascorbic1230/classroom-frontend

set +e

cd classroom-frontend

yarn

yarn build

cd ../

mkdir -p public

cp -r classroom-frontend/dist/* public/

rm -rf classroom-frontend
