import datetime

subject = '6.004 Spring 2014'

class Section():
    def __init__(self,name,description):
        self.name = name
        self.description = description

sections = [
    Section('R01','WF10, 34-301 (Silvina)'),
    Section('R02','WF11, 34-301 (Silvina)'),
    Section('R03','WF12, 34-301 (Ciara)'),
    Section('R04','WF1, 34-301 (Daniel)'),
    Section('R05','WF2, 34-301 (Ky-Anh)'),
    Section('R06','WF3, 34-301 (Ky-Anh)'),
    Section('R07','WF12, 34-302 (George)'),
    Section('R08','WF1, 34-302 (George)'),
    Section('R09','WF2, 34-302 (Patrick)'),
    Section('R10','WF3, 34-302 (Patrick)'),
]

class Assignment():
    def __init__(self,name,description,atype,date_due,date_checkoff,points,check_in):
        self.name = name
        self.description = description
        self.atype = atype  # quiz, lab
        self.date_due = date_due
        self.date_checkoff = date_checkoff
        self.points = points
        self.check_in = check_in

# some tzinfo definitions
class UTC_TZ(datetime.tzinfo):
    def utcoffset(self,dt):
        return datetime.timedelta(0)
    def tzname(self,dt):
        return "UTC"
    def dst(self,dt):
        return datetime.timedelta(0)
UTC = UTC_TZ()

class EST_TZ(datetime.tzinfo):
    def utcoffset(self,dt):
        return -datetime.timedelta(hours=5)
    def tzname(self,dt):
        return "EST"
    def dst(self,dt):
        return datetime.timedelta(0)
EST = EST_TZ()

class EDT_TZ(datetime.tzinfo):
    def utcoffset(self,dt):
        return -datetime.timedelta(hours=4)
    def tzname(self,dt):
        return "EDT"
    def dst(self,dt):
        return datetime.timedelta(0)
EDT = EDT_TZ()

def to_utc(year,month,day,hour=0,minute=0,tzinfo=EST):
    return datetime.datetime(year,month,day,hour,minute,tzinfo=tzinfo).astimezone(UTC)

# tailored for 2014
def from_utc(t):
    if t > to_utc(2014,3,9,tzinfo=EST) and t < to_utc(2014,11,2,tzinfo=EDT):
        return t.astimezone(EDT)
    else:
        return t.astimezone(EST)

# convert due dates to UTC -- urk!
assignments = [
    # quizzes
    Assignment('Q1','Quiz 1','quiz',
               to_utc(2014,2,28),None,
               30,{'1': 10, '2': 10, '3': 10}),
    Assignment('Q2','Quiz 2','quiz',
               to_utc(2014,3,21,tzinfo=EDT),None,
               30,{'1': 10, '2': 10, '3': 10}),
    Assignment('Q3','Quiz 3','quiz',
               to_utc(2014,4,18,tzinfo=EDT),None,
               30,{'1': 10, '2': 10, '3': 10}),
    Assignment('Q4','Quiz 4','quiz',
               to_utc(2014,5,9,tzinfo=EDT),None,
               30,{'1': 10, '2': 10, '3': 10}),

    # labs (due "6a the following day")
    Assignment('L1','Lab 1','lab',
               to_utc(2014,2,21,6),to_utc(2014,2,28,6),
               4,{'checksum': 4}),
    Assignment('L2','Lab 2','lab',
               to_utc(2014,3,7,6),to_utc(2014,3,13,6,tzinfo=EDT),
               10,{'checksum1': 6,'checksum2': 10}),
    Assignment('L3','Lab 3','lab',
               to_utc(2014,3,14,6,tzinfo=EDT),to_utc(2014,3,21,6,tzinfo=EDT),
               4,{'checksum': 4}),
    Assignment('L4','Lab 4','lab',
               to_utc(2014,4,4,6,tzinfo=EDT),to_utc(2014,4,11,6,tzinfo=EDT),
               6,{'checksum': 6}),
    Assignment('L5','Lab 5','lab',
               to_utc(2014,4,11,6,tzinfo=EDT),to_utc(2014,4,18,6,tzinfo=EDT),
               4,{'checksum': 4}),
    Assignment('L6','Lab 6','lab',
               to_utc(2014,4,25,6,tzinfo=EDT),to_utc(2014,5,2,6,tzinfo=EDT),
               25,{'checksum': 25}),
    Assignment('L7','Lab 7','lab',
               to_utc(2014,5,2,6,tzinfo=EDT),to_utc(2014,5,16,6,tzinfo=EDT),
               7,{'checksum': 7}),
    Assignment('L8','Lab 8','lab',
               to_utc(2014,5,9,6,tzinfo=EDT),to_utc(2014,5,16,6,tzinfo=EDT),
               15,{'checksum': 15}),

    # design project
    Assignment('DP','Design Project','project',
               to_utc(2014,5,16,6,tzinfo=EDT),None,
               20,{'checksum': -1}),
]
