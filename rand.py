#!/usr/bin/env python
#   Simple random data sent to influxdb examples

import random
import json
import math
import requests
import sys
from time import sleep

DATABASE = 'test1'
STATUS_MOD = 10
DATA_MOD = 3

n = 0
x = [0, 0, 0] 

while True:
  for i in range(len(x)):
    u = random.random()-0.5;
    x[i] += u;
    if x[i] > 10 or x[i] < -10: x[i] -= u;

  if n % DATA_MOD == 0:
    v = [{'name': 'sensor', 'columns': ['Series-A', 'Series-B'], 'points': [x[0:2]]}]
  else:
    v = [{'name': 'sensor', 'columns': ['Series-A', 'Series-B', 'Series-C'], 'points': [x]}]

  #print 'v = ' + repr(v)

  r = requests.post('http://54.183.211.177:8086/db/%s/series?u=root&p=root' % DATABASE, data=json.dumps(v))
  if r.status_code != 200:
      print 'Failed to add point to influxdb -- aborting.'
      sys.exit(1)

  n += 1
  sleep(1)
  if n % STATUS_MOD == 0:
      print '%d points inserted.' % n

