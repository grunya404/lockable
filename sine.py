#!/usr/bin/env python

import random
import json
import math
import requests
import sys
from time import sleep

DATABASE = 'test1'
STATUS_MOD = 10

n = 0
x = 0
while True:
    for d in range(0, 360):
        u = (random.random()-0.5) * 0.1;
        x += u;
        if u > 1 or x < -1: x -= u;
        v = [{'name': 'sin', 'columns': ['val'], 'points': [[math.sin(math.radians(d))]]}]
        v = [{'name': 'sin', 'columns': ['val'], 'points': [[x]]}]
        r = requests.post('http://54.183.211.177:8086/db/%s/series?u=root&p=root' % DATABASE, data=json.dumps(v))
        if r.status_code != 200:
            print 'Failed to add point to influxdb -- aborting.'
            sys.exit(1)
        n += 1
        sleep(1)
        if n % STATUS_MOD == 0:
            print '%d points inserted.' % n
