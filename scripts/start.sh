#!/bin/bash

docker-compose down && docker-compose build --pull && docker-compose up