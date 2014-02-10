import math

from checker_utils import *

answer_key = {
  "/test/exercises.html": {
    "1": (lambda (answer): check_number(answer,math.pi,tol=.001)),
    "1A": (lambda (answer): check_number(answer,math.pi*9,tol=.1)),
    "2": (lambda (answer): check_formula(answer,'m*c*c',variables=['m','c'],samples=[(i,i) for i in xrange(10)])),
  },
}
