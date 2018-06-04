#!/bin/bash
docker run --privileged --rm -ti -e cloudant_url=${cloudant_url} -e cloudant_db=${cloudant_db} energydata:pi
