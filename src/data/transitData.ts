import { Stop, BusRoute, RouteRecommendation } from '../types';
import roadData from './roadGeometries.json';
import { getRouteRoadGeometry, sliceRouteRoadGeometry } from '../services/osrmRouteService';
import { getAllUnderlyingStopIds } from './canonicalStops';
import { snapStopToArterial } from '../services/corridorSnappingService';

export const SEGMENT_PATHS = (roadData as any).segments as Record<string, [number, number][]>;

export const STOPS: Stop[] = [
  {
    "id": "dahighat",
    "name": "Dahighat",
    "code": "DAH-01",
    "platform": "Dahighat Platform",
    "lat": 22.5492,
    "lng": 88.3247,
    "description": "Transit stop at Dahighat, Kolkata"
  },
  {
    "id": "khidderpur",
    "name": "Khidderpur",
    "code": "KHI-02",
    "platform": "Khidderpur Platform",
    "lat": 22.5372,
    "lng": 88.3231,
    "description": "Transit stop at Khidderpur, Kolkata"
  },
  {
    "id": "mominpur",
    "name": "Mominpur",
    "code": "MOM-03",
    "platform": "Mominpur Platform",
    "lat": 22.5271,
    "lng": 88.3219,
    "description": "Transit stop at Mominpur, Kolkata"
  },
  {
    "id": "hazra",
    "name": "Hazra",
    "code": "HAZ-04",
    "platform": "Hazra Platform",
    "lat": 22.5228,
    "lng": 88.35,
    "description": "Transit stop at Hazra, Kolkata"
  },
  {
    "id": "elgin-road",
    "name": "Elgin Road",
    "code": "ELG-05",
    "platform": "Elgin Road Platform",
    "lat": 22.5379,
    "lng": 88.3503,
    "description": "Transit stop at Elgin Road, Kolkata"
  },
  {
    "id": "park-street",
    "name": "Park street",
    "code": "PAR-06",
    "platform": "Park street Platform",
    "lat": 22.5541,
    "lng": 88.3514,
    "description": "Transit stop at Park street, Kolkata"
  },
  {
    "id": "esplanade",
    "name": "Esplanade",
    "code": "ESP-07",
    "platform": "Esplanade Platform",
    "lat": 22.5653,
    "lng": 88.3519,
    "description": "Transit stop at Esplanade, Kolkata"
  },
  {
    "id": "subod-mallick-squre",
    "name": "Subod Mallick Squre",
    "code": "SUB-08",
    "platform": "Subod Mallick Squre Platform",
    "lat": 22.5636,
    "lng": 88.3595,
    "description": "Transit stop at Subod Mallick Squre, Kolkata"
  },
  {
    "id": "moulali",
    "name": "Moulali",
    "code": "MOU-09",
    "platform": "Moulali Platform",
    "lat": 22.568,
    "lng": 88.3695,
    "description": "Transit stop at Moulali, Kolkata"
  },
  {
    "id": "sealdah",
    "name": "Sealdah",
    "code": "SEA-10",
    "platform": "Sealdah Platform",
    "lat": 22.5678,
    "lng": 88.371,
    "description": "Transit stop at Sealdah, Kolkata"
  },
  {
    "id": "ultadanga",
    "name": "Ultadanga",
    "code": "ULT-11",
    "platform": "Ultadanga Platform",
    "lat": 22.5945,
    "lng": 88.3835,
    "description": "Transit stop at Ultadanga, Kolkata"
  },
  {
    "id": "khanna",
    "name": "Khanna",
    "code": "KHA-12",
    "platform": "Khanna Platform",
    "lat": 22.5916,
    "lng": 88.3755,
    "description": "Transit stop at Khanna, Kolkata"
  },
  {
    "id": "hatibagan",
    "name": "Hatibagan",
    "code": "HAT-13",
    "platform": "Hatibagan Platform",
    "lat": 22.5975,
    "lng": 88.3707,
    "description": "Transit stop at Hatibagan, Kolkata"
  },
  {
    "id": "grey-st",
    "name": "Grey St",
    "code": "GRE-14",
    "platform": "Grey St Platform",
    "lat": 22.5947,
    "lng": 88.3705,
    "description": "Transit stop at Grey St, Kolkata"
  },
  {
    "id": "nimtala-ghat-st",
    "name": "Nimtala Ghat St",
    "code": "NIM-15",
    "platform": "Nimtala Ghat St Platform",
    "lat": 22.5923,
    "lng": 88.3566,
    "description": "Transit stop at Nimtala Ghat St, Kolkata"
  },
  {
    "id": "b-k-paul-ave",
    "name": "B.K.Paul Ave",
    "code": "B-K-16",
    "platform": "B.K.Paul Ave Platform",
    "lat": 22.5953,
    "lng": 88.3606,
    "description": "Transit stop at B.K.Paul Ave, Kolkata"
  },
  {
    "id": "howrah-bridge-east",
    "name": "Howrah Bridge East",
    "code": "HOW-17",
    "platform": "Howrah Bridge East Platform",
    "lat": 22.5851,
    "lng": 88.3468,
    "description": "Transit stop at Howrah Bridge East, Kolkata"
  },
  {
    "id": "howrah-stn",
    "name": "Howrah Stn",
    "code": "HOW-18",
    "platform": "Howrah Stn Platform",
    "lat": 22.5839,
    "lng": 88.3434,
    "description": "Transit stop at Howrah Stn, Kolkata"
  },
  {
    "id": "howrah",
    "name": "Howrah",
    "code": "HOW-19",
    "platform": "Howrah Platform",
    "lat": 22.5818,
    "lng": 88.3362,
    "description": "Transit stop at Howrah, Kolkata"
  },
  {
    "id": "chetla",
    "name": "Chetla",
    "code": "CHE-20",
    "platform": "Chetla Platform",
    "lat": 22.5158,
    "lng": 88.3332,
    "description": "Transit stop at Chetla, Kolkata"
  },
  {
    "id": "paikpara",
    "name": "Paikpara",
    "code": "PAI-21",
    "platform": "Paikpara Platform",
    "lat": 22.6157,
    "lng": 88.3874,
    "description": "Transit stop at Paikpara, Kolkata"
  },
  {
    "id": "shyambazar",
    "name": "Shyambazar",
    "code": "SHY-22",
    "platform": "Shyambazar Platform",
    "lat": 22.5982,
    "lng": 88.3687,
    "description": "Transit stop at Shyambazar, Kolkata"
  },
  {
    "id": "manicktala",
    "name": "Manicktala",
    "code": "MAN-23",
    "platform": "Manicktala Platform",
    "lat": 22.5864,
    "lng": 88.3761,
    "description": "Transit stop at Manicktala, Kolkata"
  },
  {
    "id": "sealdha",
    "name": "Sealdha",
    "code": "SEA-24",
    "platform": "Sealdha Platform",
    "lat": 22.5711,
    "lng": 88.3714,
    "description": "Transit stop at Sealdha, Kolkata"
  },
  {
    "id": "padmapukur",
    "name": "Padmapukur",
    "code": "PAD-25",
    "platform": "Padmapukur Platform",
    "lat": 22.4669,
    "lng": 88.3072,
    "description": "Transit stop at Padmapukur, Kolkata"
  },
  {
    "id": "darga-rd",
    "name": "Darga Rd",
    "code": "DAR-26",
    "platform": "Darga Rd Platform",
    "lat": 22.5424,
    "lng": 88.3709,
    "description": "Transit stop at Darga Rd, Kolkata"
  },
  {
    "id": "bondel-gate",
    "name": "Bondel Gate",
    "code": "BON-27",
    "platform": "Bondel Gate Platform",
    "lat": 22.5293,
    "lng": 88.3743,
    "description": "Transit stop at Bondel Gate, Kolkata"
  },
  {
    "id": "kalighat",
    "name": "Kalighat",
    "code": "KAL-28",
    "platform": "Kalighat Platform",
    "lat": 22.517,
    "lng": 88.3459,
    "description": "Transit stop at Kalighat, Kolkata"
  },
  {
    "id": "alipur-rd",
    "name": "Alipur Rd",
    "code": "ALI-29",
    "platform": "Alipur Rd Platform",
    "lat": 22.5255,
    "lng": 88.331,
    "description": "Transit stop at Alipur Rd, Kolkata"
  },
  {
    "id": "sarsuna",
    "name": "Sarsuna",
    "code": "SAR-30",
    "platform": "Sarsuna Platform",
    "lat": 22.481,
    "lng": 88.2835,
    "description": "Transit stop at Sarsuna, Kolkata"
  },
  {
    "id": "bakultala",
    "name": "Bakultala",
    "code": "BAK-31",
    "platform": "Bakultala Platform",
    "lat": 22.475,
    "lng": 88.279,
    "description": "Transit stop at Bakultala, Kolkata"
  },
  {
    "id": "chowrasta",
    "name": "Chowrasta",
    "code": "CHO-32",
    "platform": "Chowrasta Platform",
    "lat": 22.499,
    "lng": 88.313,
    "description": "Transit stop at Chowrasta, Kolkata"
  },
  {
    "id": "manton-xing",
    "name": "Manton Xing",
    "code": "MAN-33",
    "platform": "Manton Xing Platform",
    "lat": 22.5,
    "lng": 88.317,
    "description": "Transit stop at Manton Xing, Kolkata"
  },
  {
    "id": "behala-tram-depot",
    "name": "Behala Tram Depot",
    "code": "BEH-34",
    "platform": "Behala Tram Depot Platform",
    "lat": 22.501,
    "lng": 88.316,
    "description": "Transit stop at Behala Tram Depot, Kolkata"
  },
  {
    "id": "taratala-xing",
    "name": "Taratala Xing",
    "code": "TAR-35",
    "platform": "Taratala Xing Platform",
    "lat": 22.506,
    "lng": 88.321,
    "description": "Transit stop at Taratala Xing, Kolkata"
  },
  {
    "id": "casurina-ave",
    "name": "Casurina Ave",
    "code": "CAS-36",
    "platform": "Casurina Ave Platform",
    "lat": 22.549702,
    "lng": 88.342101,
    "description": "Transit stop at Casurina Ave, Kolkata"
  },
  {
    "id": "b-b-d-bag",
    "name": "B.B.D.Bag",
    "code": "B-B-37",
    "platform": "B.B.D.Bag Platform",
    "lat": 22.5697,
    "lng": 88.3467,
    "description": "Transit stop at B.B.D.Bag, Kolkata"
  },
  {
    "id": "dum-dum",
    "name": "Dum Dum",
    "code": "DUM-38",
    "platform": "Dum Dum Platform",
    "lat": 22.642,
    "lng": 88.42,
    "description": "Transit stop at Dum Dum, Kolkata"
  },
  {
    "id": "dum-dum-stn",
    "name": "Dum Dum Stn",
    "code": "DUM-39",
    "platform": "Dum Dum Stn Platform",
    "lat": 22.618,
    "lng": 88.42,
    "description": "Transit stop at Dum Dum Stn, Kolkata"
  },
  {
    "id": "chria",
    "name": "Chria",
    "code": "CHR-40",
    "platform": "Chria Platform",
    "lat": 22.625,
    "lng": 88.398,
    "description": "Transit stop at Chria, Kolkata"
  },
  {
    "id": "bedon-squre",
    "name": "Bedon Squre",
    "code": "BED-41",
    "platform": "Bedon Squre Platform",
    "lat": 22.59,
    "lng": 88.366,
    "description": "Transit stop at Bedon Squre, Kolkata"
  },
  {
    "id": "bichalighat",
    "name": "Bichalighat",
    "code": "BIC-42",
    "platform": "Bichalighat Platform",
    "lat": 22.547,
    "lng": 88.322,
    "description": "Transit stop at Bichalighat, Kolkata"
  },
  {
    "id": "hmg-college-metiabruj",
    "name": "HMG College/Metiabruj",
    "code": "HMG-43",
    "platform": "HMG College/Metiabruj Platform",
    "lat": 22.5455,
    "lng": 88.301,
    "description": "Transit stop at HMG College/Metiabruj, Kolkata"
  },
  {
    "id": "halder-para",
    "name": "Halder Para",
    "code": "HAL-44",
    "platform": "Halder Para Platform",
    "lat": 22.542,
    "lng": 88.312,
    "description": "Transit stop at Halder Para, Kolkata"
  },
  {
    "id": "abestors-more",
    "name": "Abestors More",
    "code": "ABE-45",
    "platform": "Abestors More Platform",
    "lat": 22.54,
    "lng": 88.311,
    "description": "Transit stop at Abestors More, Kolkata"
  },
  {
    "id": "ramnagar-more",
    "name": "Ramnagar More",
    "code": "RAM-46",
    "platform": "Ramnagar More Platform",
    "lat": 22.538,
    "lng": 88.31,
    "description": "Transit stop at Ramnagar More, Kolkata"
  },
  {
    "id": "dockyard",
    "name": "Dockyard",
    "code": "DOC-47",
    "platform": "Dockyard Platform",
    "lat": 22.546,
    "lng": 88.317,
    "description": "Transit stop at Dockyard, Kolkata"
  },
  {
    "id": "fancy-market",
    "name": "Fancy Market",
    "code": "FAN-48",
    "platform": "Fancy Market Platform",
    "lat": 22.545,
    "lng": 88.323,
    "description": "Transit stop at Fancy Market, Kolkata"
  },
  {
    "id": "hastings",
    "name": "Hastings",
    "code": "HAS-49",
    "platform": "Hastings Platform",
    "lat": 22.554,
    "lng": 88.33,
    "description": "Transit stop at Hastings, Kolkata"
  },
  {
    "id": "j-k-island",
    "name": "J.K.Island",
    "code": "J-K-50",
    "platform": "J.K.Island Platform",
    "lat": 22.558,
    "lng": 88.335,
    "description": "Transit stop at J.K.Island, Kolkata"
  },
  {
    "id": "mayo-rd",
    "name": "Mayo Rd",
    "code": "MAY-51",
    "platform": "Mayo Rd Platform",
    "lat": 22.551,
    "lng": 88.345,
    "description": "Transit stop at Mayo Rd, Kolkata"
  },
  {
    "id": "cannel-bridge",
    "name": "Cannel Bridge",
    "code": "CAN-52",
    "platform": "Cannel Bridge Platform",
    "lat": 22.57,
    "lng": 88.372,
    "description": "Transit stop at Cannel Bridge, Kolkata"
  },
  {
    "id": "rashmoni-bazar",
    "name": "Rashmoni Bazar",
    "code": "RAS-53",
    "platform": "Rashmoni Bazar Platform",
    "lat": 22.575,
    "lng": 88.372,
    "description": "Transit stop at Rashmoni Bazar, Kolkata"
  },
  {
    "id": "jora-mandir",
    "name": "Jora Mandir",
    "code": "JOR-54",
    "platform": "Jora Mandir Platform",
    "lat": 22.575,
    "lng": 88.373,
    "description": "Transit stop at Jora Mandir, Kolkata"
  },
  {
    "id": "beliaghata-main-road",
    "name": "Beliaghata Main Road",
    "code": "BEL-55",
    "platform": "Beliaghata Main Road Platform",
    "lat": 22.56942,
    "lng": 88.40581,
    "description": "Transit stop at Beliaghata Main Road, Kolkata"
  },
  {
    "id": "central-park",
    "name": "Central Park",
    "code": "CEN-56",
    "platform": "Central Park Platform",
    "lat": 22.586154,
    "lng": 88.417382,
    "description": "Transit stop at Central Park, Kolkata"
  },
  {
    "id": "karunamoyee",
    "name": "Karunamoyee",
    "code": "KAR-57",
    "platform": "Karunamoyee Platform",
    "lat": 22.586411,
    "lng": 88.420835,
    "description": "Transit stop at Karunamoyee, Kolkata"
  },
  {
    "id": "unnayan-bhavan",
    "name": "Unnayan Bhavan",
    "code": "UNN-58",
    "platform": "Unnayan Bhavan Platform",
    "lat": 22.585,
    "lng": 88.415,
    "description": "Transit stop at Unnayan Bhavan, Kolkata"
  },
  {
    "id": "bikash-bhavan",
    "name": "Bikash Bhavan",
    "code": "BIK-59",
    "platform": "Bikash Bhavan Platform",
    "lat": 22.585,
    "lng": 88.416,
    "description": "Transit stop at Bikash Bhavan, Kolkata"
  },
  {
    "id": "garia",
    "name": "Garia",
    "code": "GAR-60",
    "platform": "Garia Platform",
    "lat": 22.464,
    "lng": 88.392,
    "description": "Transit stop at Garia, Kolkata"
  },
  {
    "id": "ganguli-bagan",
    "name": "Ganguli Bagan",
    "code": "GAN-61",
    "platform": "Ganguli Bagan Platform",
    "lat": 22.487,
    "lng": 88.38,
    "description": "Transit stop at Ganguli Bagan, Kolkata"
  },
  {
    "id": "baghajatin",
    "name": "Baghajatin",
    "code": "BAG-62",
    "platform": "Baghajatin Platform",
    "lat": 22.485,
    "lng": 88.378,
    "description": "Transit stop at Baghajatin, Kolkata"
  },
  {
    "id": "jadavpur",
    "name": "Jadavpur",
    "code": "JAD-63",
    "platform": "Jadavpur Platform",
    "lat": 22.495671,
    "lng": 88.37128,
    "description": "Transit stop at Jadavpur, Kolkata"
  },
  {
    "id": "dhakuria",
    "name": "Dhakuria",
    "code": "DHA-64",
    "platform": "Dhakuria Platform",
    "lat": 22.509,
    "lng": 88.367,
    "description": "Transit stop at Dhakuria, Kolkata"
  },
  {
    "id": "golpark",
    "name": "Golpark",
    "code": "GOL-65",
    "platform": "Golpark Platform",
    "lat": 22.5195,
    "lng": 88.3627,
    "description": "Transit stop at Golpark, Kolkata"
  },
  {
    "id": "d-park",
    "name": "D.Park",
    "code": "D-P-66",
    "platform": "D.Park Platform",
    "lat": 22.574671,
    "lng": 88.345298,
    "description": "Transit stop at D.Park, Kolkata"
  },
  {
    "id": "r-b-ave",
    "name": "R.B.Ave",
    "code": "R-B-67",
    "platform": "R.B.Ave Platform",
    "lat": 22.5183,
    "lng": 88.3559,
    "description": "Transit stop at R.B.Ave, Kolkata"
  },
  {
    "id": "exide",
    "name": "Exide",
    "code": "EXI-68",
    "platform": "Exide Platform",
    "lat": 22.546,
    "lng": 88.3505,
    "description": "Transit stop at Exide, Kolkata"
  },
  {
    "id": "p-t-s",
    "name": "P.T.S",
    "code": "P-T-69",
    "platform": "P.T.S Platform",
    "lat": 22.539,
    "lng": 88.3505,
    "description": "Transit stop at P.T.S, Kolkata"
  },
  {
    "id": "nabanna",
    "name": "Nabanna",
    "code": "NAB-70",
    "platform": "Nabanna Platform",
    "lat": 22.572,
    "lng": 88.34,
    "description": "Transit stop at Nabanna, Kolkata"
  },
  {
    "id": "naktala",
    "name": "Naktala",
    "code": "NAK-71",
    "platform": "Naktala Platform",
    "lat": 22.487,
    "lng": 88.362,
    "description": "Transit stop at Naktala, Kolkata"
  },
  {
    "id": "regentpark",
    "name": "Regentpark",
    "code": "REG-72",
    "platform": "Regentpark Platform",
    "lat": 22.49,
    "lng": 88.356,
    "description": "Transit stop at Regentpark, Kolkata"
  },
  {
    "id": "ranikhuti",
    "name": "Ranikhuti",
    "code": "RAN-73",
    "platform": "Ranikhuti Platform",
    "lat": 22.493,
    "lng": 88.355,
    "description": "Transit stop at Ranikhuti, Kolkata"
  },
  {
    "id": "tollygunge-metro",
    "name": "Tollygunge Metro",
    "code": "TOL-74",
    "platform": "Tollygunge Metro Platform",
    "lat": 22.5,
    "lng": 88.348,
    "description": "Transit stop at Tollygunge Metro, Kolkata"
  },
  {
    "id": "tollygunge-phari",
    "name": "Tollygunge Phari",
    "code": "TOL-75",
    "platform": "Tollygunge Phari Platform",
    "lat": 22.503,
    "lng": 88.348,
    "description": "Transit stop at Tollygunge Phari, Kolkata"
  },
  {
    "id": "thakurpukur",
    "name": "Thakurpukur",
    "code": "THA-76",
    "platform": "Thakurpukur Platform",
    "lat": 22.464,
    "lng": 88.308,
    "description": "Transit stop at Thakurpukur, Kolkata"
  },
  {
    "id": "d-h-road",
    "name": "D.H Road",
    "code": "D-H-77",
    "platform": "D.H Road Platform",
    "lat": 22.477,
    "lng": 88.312,
    "description": "Transit stop at D.H Road, Kolkata"
  },
  {
    "id": "vidhya-sagar-satu",
    "name": "Vidhya Sagar Satu",
    "code": "VID-78",
    "platform": "Vidhya Sagar Satu Platform",
    "lat": 22.582,
    "lng": 88.34,
    "description": "Transit stop at Vidhya Sagar Satu, Kolkata"
  },
  {
    "id": "prince-a-saha-rd",
    "name": "Prince A.Saha Rd",
    "code": "PRI-79",
    "platform": "Prince A.Saha Rd Platform",
    "lat": 22.498,
    "lng": 88.37,
    "description": "Transit stop at Prince A.Saha Rd, Kolkata"
  },
  {
    "id": "parnasree",
    "name": "Parnasree",
    "code": "PAR-80",
    "platform": "Parnasree Platform",
    "lat": 22.497,
    "lng": 88.326,
    "description": "Transit stop at Parnasree, Kolkata"
  },
  {
    "id": "howrah-bridge-south",
    "name": "Howrah Bridge South",
    "code": "HOW-81",
    "platform": "Howrah Bridge South Platform",
    "lat": 22.582,
    "lng": 88.345,
    "description": "Transit stop at Howrah Bridge South, Kolkata"
  },
  {
    "id": "joka",
    "name": "Joka",
    "code": "JOK-82",
    "platform": "Joka Platform",
    "lat": 22.456,
    "lng": 88.314,
    "description": "Transit stop at Joka, Kolkata"
  },
  {
    "id": "cancer-hospital",
    "name": "Cancer Hospital",
    "code": "CAN-83",
    "platform": "Cancer Hospital Platform",
    "lat": 22.461,
    "lng": 88.308,
    "description": "Transit stop at Cancer Hospital, Kolkata"
  },
  {
    "id": "kabardanga",
    "name": "Kabardanga",
    "code": "KAB-84",
    "platform": "Kabardanga Platform",
    "lat": 22.456,
    "lng": 88.303,
    "description": "Transit stop at Kabardanga, Kolkata"
  },
  {
    "id": "haridevpur",
    "name": "Haridevpur",
    "code": "HAR-85",
    "platform": "Haridevpur Platform",
    "lat": 22.479,
    "lng": 88.317,
    "description": "Transit stop at Haridevpur, Kolkata"
  },
  {
    "id": "gariahat",
    "name": "Gariahat",
    "code": "GAR-86",
    "platform": "Gariahat Platform",
    "lat": 22.5183,
    "lng": 88.3648,
    "description": "Transit stop at Gariahat, Kolkata"
  },
  {
    "id": "ruby",
    "name": "Ruby",
    "code": "RUB-87",
    "platform": "Ruby Platform",
    "lat": 22.513725,
    "lng": 88.399564,
    "description": "Transit stop at Ruby, Kolkata"
  },
  {
    "id": "chingrihata",
    "name": "Chingrihata",
    "code": "CHI-88",
    "platform": "Chingrihata Platform",
    "lat": 22.562181,
    "lng": 88.403562,
    "description": "Transit stop at Chingrihata, Kolkata"
  },
  {
    "id": "sdf",
    "name": "SDF",
    "code": "SDF-89",
    "platform": "SDF Platform",
    "lat": 22.556,
    "lng": 88.428,
    "description": "Transit stop at SDF, Kolkata"
  },
  {
    "id": "college-more",
    "name": "College More",
    "code": "COL-90",
    "platform": "College More Platform",
    "lat": 22.576,
    "lng": 88.462,
    "description": "Transit stop at College More, Kolkata"
  },
  {
    "id": "technopolis",
    "name": "Technopolis",
    "code": "TEC-91",
    "platform": "Technopolis Platform",
    "lat": 22.572,
    "lng": 88.464,
    "description": "Transit stop at Technopolis, Kolkata"
  },
  {
    "id": "new-town",
    "name": "New Town",
    "code": "NEW-92",
    "platform": "New Town Platform",
    "lat": 22.585,
    "lng": 88.472,
    "description": "Transit stop at New Town, Kolkata"
  },
  {
    "id": "raipur-club",
    "name": "Raipur Club",
    "code": "RAI-93",
    "platform": "Raipur Club Platform",
    "lat": 22.47,
    "lng": 88.383,
    "description": "Transit stop at Raipur Club, Kolkata"
  },
  {
    "id": "chakraberia",
    "name": "Chakraberia",
    "code": "CHA-94",
    "platform": "Chakraberia Platform",
    "lat": 22.539,
    "lng": 88.352,
    "description": "Transit stop at Chakraberia, Kolkata"
  },
  {
    "id": "birla-taramondal",
    "name": "Birla Taramondal",
    "code": "BIR-95",
    "platform": "Birla Taramondal Platform",
    "lat": 22.546,
    "lng": 88.348,
    "description": "Transit stop at Birla Taramondal, Kolkata"
  },
  {
    "id": "ajoynagar",
    "name": "Ajoynagar",
    "code": "AJO-96",
    "platform": "Ajoynagar Platform",
    "lat": 22.484392,
    "lng": 88.397682,
    "description": "Transit stop at Ajoynagar, Kolkata"
  },
  {
    "id": "sukanta-setu",
    "name": "Sukanta Setu",
    "code": "SUK-97",
    "platform": "Sukanta Setu Platform",
    "lat": 22.53,
    "lng": 88.402,
    "description": "Transit stop at Sukanta Setu, Kolkata"
  },
  {
    "id": "e-m-byepass",
    "name": "E M Byepass",
    "code": "E-M-98",
    "platform": "E M Byepass Platform",
    "lat": 22.53,
    "lng": 88.4,
    "description": "Transit stop at E M Byepass, Kolkata"
  },
  {
    "id": "sc-city",
    "name": "Sc. City",
    "code": "SC--99",
    "platform": "Sc. City Platform",
    "lat": 22.533,
    "lng": 88.413,
    "description": "Transit stop at Sc. City, Kolkata"
  },
  {
    "id": "narkel-bagan",
    "name": "Narkel Bagan",
    "code": "NAR-100",
    "platform": "Narkel Bagan Platform",
    "lat": 22.602,
    "lng": 88.482,
    "description": "Transit stop at Narkel Bagan, Kolkata"
  },
  {
    "id": "eco-space",
    "name": "Eco Space",
    "code": "ECO-101",
    "platform": "Eco Space Platform",
    "lat": 22.575,
    "lng": 88.464,
    "description": "Transit stop at Eco Space, Kolkata"
  },
  {
    "id": "topsia",
    "name": "Topsia",
    "code": "TOP-102",
    "platform": "Topsia Platform",
    "lat": 22.542,
    "lng": 88.402,
    "description": "Transit stop at Topsia, Kolkata"
  },
  {
    "id": "zoo",
    "name": "Zoo",
    "code": "ZOO-103",
    "platform": "Zoo Platform",
    "lat": 22.535,
    "lng": 88.332,
    "description": "Transit stop at Zoo, Kolkata"
  },
  {
    "id": "mission-row-xing",
    "name": "Mission Row Xing",
    "code": "MIS-104",
    "platform": "Mission Row Xing Platform",
    "lat": 22.5686,
    "lng": 88.3486,
    "description": "Transit stop at Mission Row Xing, Kolkata"
  },
  {
    "id": "santragachi",
    "name": "Santragachi",
    "code": "SAN-105",
    "platform": "Santragachi Platform",
    "lat": 22.573,
    "lng": 88.308,
    "description": "Transit stop at Santragachi, Kolkata"
  },
  {
    "id": "cr-avenue",
    "name": "CR Avenue",
    "code": "CR--106",
    "platform": "CR Avenue Platform",
    "lat": 22.5745,
    "lng": 88.3625,
    "description": "Transit stop at CR Avenue, Kolkata"
  },
  {
    "id": "bt-road",
    "name": "BT Road",
    "code": "BT--107",
    "platform": "BT Road Platform",
    "lat": 22.65,
    "lng": 88.37,
    "description": "Transit stop at BT Road, Kolkata"
  },
  {
    "id": "dunlop",
    "name": "Dunlop",
    "code": "DUN-108",
    "platform": "Dunlop Platform",
    "lat": 22.665,
    "lng": 88.38,
    "description": "Transit stop at Dunlop, Kolkata"
  },
  {
    "id": "sodpur",
    "name": "Sodpur",
    "code": "SOD-109",
    "platform": "Sodpur Platform",
    "lat": 22.696,
    "lng": 88.38,
    "description": "Transit stop at Sodpur, Kolkata"
  },
  {
    "id": "titagarh",
    "name": "Titagarh",
    "code": "TIT-110",
    "platform": "Titagarh Platform",
    "lat": 22.742,
    "lng": 88.375,
    "description": "Transit stop at Titagarh, Kolkata"
  },
  {
    "id": "barrackpore",
    "name": "Barrackpore",
    "code": "BAR-111",
    "platform": "Barrackpore Platform",
    "lat": 22.767,
    "lng": 88.37,
    "description": "Transit stop at Barrackpore, Kolkata"
  },
  {
    "id": "salt-lake-depot-gate",
    "name": "Salt Lake Depot Gate",
    "code": "SAL-112",
    "platform": "Salt Lake Depot Gate Platform",
    "lat": 22.582,
    "lng": 88.418,
    "description": "Transit stop at Salt Lake Depot Gate, Kolkata"
  },
  {
    "id": "aliah-university",
    "name": "Aliah University",
    "code": "ALI-113",
    "platform": "Aliah University Platform",
    "lat": 22.576,
    "lng": 88.465,
    "description": "Transit stop at Aliah University, Kolkata"
  },
  {
    "id": "daber-more",
    "name": "Daber More",
    "code": "DAB-114",
    "platform": "Daber More Platform",
    "lat": 22.585,
    "lng": 88.46,
    "description": "Transit stop at Daber More, Kolkata"
  },
  {
    "id": "eco-park",
    "name": "ECO Park",
    "code": "ECO-115",
    "platform": "ECO Park Platform",
    "lat": 22.612,
    "lng": 88.47,
    "description": "Transit stop at ECO Park, Kolkata"
  },
  {
    "id": "city-centre-ii",
    "name": "City Centre II",
    "code": "CIT-116",
    "platform": "City Centre II Platform",
    "lat": 22.602,
    "lng": 88.455,
    "description": "Transit stop at City Centre II, Kolkata"
  },
  {
    "id": "haldiram",
    "name": "Haldiram",
    "code": "HAL-117",
    "platform": "Haldiram Platform",
    "lat": 22.639,
    "lng": 88.431,
    "description": "Transit stop at Haldiram, Kolkata"
  },
  {
    "id": "airport-gate-no-1",
    "name": "Airport Gate No. 1",
    "code": "AIR-118",
    "platform": "Airport Gate No. 1 Platform",
    "lat": 22.647,
    "lng": 88.439,
    "description": "Transit stop at Airport Gate No. 1, Kolkata"
  },
  {
    "id": "belghoria-exp-way",
    "name": "Belghoria Exp. Way",
    "code": "BEL-119",
    "platform": "Belghoria Exp. Way Platform",
    "lat": 22.658,
    "lng": 88.36,
    "description": "Transit stop at Belghoria Exp. Way, Kolkata"
  },
  {
    "id": "dakshineswar",
    "name": "Dakshineswar",
    "code": "DAK-120",
    "platform": "Dakshineswar Platform",
    "lat": 22.654,
    "lng": 88.358,
    "description": "Transit stop at Dakshineswar, Kolkata"
  },
  {
    "id": "ballyhalt",
    "name": "Ballyhalt",
    "code": "BAL-121",
    "platform": "Ballyhalt Platform",
    "lat": 22.635,
    "lng": 88.34,
    "description": "Transit stop at Ballyhalt, Kolkata"
  },
  {
    "id": "rajchandrapur",
    "name": "Rajchandrapur",
    "code": "RAJ-122",
    "platform": "Rajchandrapur Platform",
    "lat": 22.652914,
    "lng": 88.321314,
    "description": "Transit stop at Rajchandrapur, Kolkata"
  },
  {
    "id": "patuli",
    "name": "Patuli",
    "code": "PAT-123",
    "platform": "Patuli Platform",
    "lat": 22.482,
    "lng": 88.387,
    "description": "Transit stop at Patuli, Kolkata"
  },
  {
    "id": "kamalgazi",
    "name": "Kamalgazi",
    "code": "KAM-124",
    "platform": "Kamalgazi Platform",
    "lat": 22.475,
    "lng": 88.397,
    "description": "Transit stop at Kamalgazi, Kolkata"
  },
  {
    "id": "dhalai-bridge",
    "name": "Dhalai Bridge",
    "code": "DHA-125",
    "platform": "Dhalai Bridge Platform",
    "lat": 22.487,
    "lng": 88.388,
    "description": "Transit stop at Dhalai Bridge, Kolkata"
  },
  {
    "id": "peerless-hospital",
    "name": "Peerless Hospital",
    "code": "PEE-126",
    "platform": "Peerless Hospital Platform",
    "lat": 22.5,
    "lng": 88.402,
    "description": "Transit stop at Peerless Hospital, Kolkata"
  },
  {
    "id": "kalikapur",
    "name": "Kalikapur",
    "code": "KAL-127",
    "platform": "Kalikapur Platform",
    "lat": 22.503,
    "lng": 88.397,
    "description": "Transit stop at Kalikapur, Kolkata"
  },
  {
    "id": "hazra-park",
    "name": "Hazra Park",
    "code": "HAZ-128",
    "platform": "Hazra Park Platform",
    "lat": 22.5237,
    "lng": 88.3489,
    "description": "Transit stop at Hazra Park, Kolkata"
  },
  {
    "id": "lake-town-jaya-cinema",
    "name": "Lake Town (Jaya Cinema)",
    "code": "LAK-129",
    "platform": "Lake Town (Jaya Cinema) Platform",
    "lat": 22.606,
    "lng": 88.403,
    "description": "Transit stop at Lake Town (Jaya Cinema), Kolkata"
  },
  {
    "id": "hudco-ultadanga",
    "name": "HUDCO/Ultadanga",
    "code": "HUD-130",
    "platform": "HUDCO/Ultadanga Platform",
    "lat": 22.596,
    "lng": 88.39,
    "description": "Transit stop at HUDCO/Ultadanga, Kolkata"
  },
  {
    "id": "kankurgachi",
    "name": "Kankurgachi",
    "code": "KAN-131",
    "platform": "Kankurgachi Platform",
    "lat": 22.5825,
    "lng": 88.383,
    "description": "Transit stop at Kankurgachi, Kolkata"
  },
  {
    "id": "girish-park-c-r-avn-xing-m-g-road-xing",
    "name": "Girish Park/C.R. Avn. Xing./M.G.Road Xing",
    "code": "GIR-132",
    "platform": "Girish Park/C.R. Avn. Xing./M.G.Road Xing Platform",
    "lat": 22.5837,
    "lng": 88.3567,
    "description": "Transit stop at Girish Park/C.R. Avn. Xing./M.G.Road Xing, Kolkata"
  },
  {
    "id": "barrabazar",
    "name": "Barrabazar",
    "code": "BAR-133",
    "platform": "Barrabazar Platform",
    "lat": 22.5763,
    "lng": 88.3494,
    "description": "Transit stop at Barrabazar, Kolkata"
  },
  {
    "id": "kadapara-beliaghata-xing",
    "name": "Kadapara/Beliaghata Xing",
    "code": "KAD-134",
    "platform": "Kadapara/Beliaghata Xing Platform",
    "lat": 22.568,
    "lng": 88.397,
    "description": "Transit stop at Kadapara/Beliaghata Xing, Kolkata"
  },
  {
    "id": "sapoorji",
    "name": "Sapoorji",
    "code": "SAP-135",
    "platform": "Sapoorji Platform",
    "lat": 22.607,
    "lng": 88.487,
    "description": "Transit stop at Sapoorji, Kolkata"
  },
  {
    "id": "james-long-sarani",
    "name": "James long Sarani",
    "code": "JAM-136",
    "platform": "James long Sarani Platform",
    "lat": 22.498,
    "lng": 88.307,
    "description": "Transit stop at James long Sarani, Kolkata"
  },
  {
    "id": "ramkrishna-ashram",
    "name": "Ramkrishna Ashram",
    "code": "RAM-137",
    "platform": "Ramkrishna Ashram Platform",
    "lat": 22.497,
    "lng": 88.304,
    "description": "Transit stop at Ramkrishna Ashram, Kolkata"
  },
  {
    "id": "siriti-more",
    "name": "Siriti More",
    "code": "SIR-138",
    "platform": "Siriti More Platform",
    "lat": 22.493,
    "lng": 88.302,
    "description": "Transit stop at Siriti More, Kolkata"
  },
  {
    "id": "lake-gardens",
    "name": "Lake Gardens",
    "code": "LAK-139",
    "platform": "Lake Gardens Platform",
    "lat": 22.504,
    "lng": 88.358,
    "description": "Transit stop at Lake Gardens, Kolkata"
  },
  {
    "id": "v-i-p-road",
    "name": "V.I.P.Road",
    "code": "V-I-140",
    "platform": "V.I.P.Road Platform",
    "lat": 22.63,
    "lng": 88.43,
    "description": "Transit stop at V.I.P.Road, Kolkata"
  },
  {
    "id": "airport",
    "name": "Airport",
    "code": "AIR-141",
    "platform": "Airport Platform",
    "lat": 22.654,
    "lng": 88.4467,
    "description": "Transit stop at Airport, Kolkata"
  },
  {
    "id": "doltala",
    "name": "Doltala",
    "code": "DOL-142",
    "platform": "Doltala Platform",
    "lat": 22.687,
    "lng": 88.45,
    "description": "Transit stop at Doltala, Kolkata"
  },
  {
    "id": "madhyamgram-chowrasta-xing",
    "name": "Madhyamgram Chowrasta Xing",
    "code": "MAD-143",
    "platform": "Madhyamgram Chowrasta Xing Platform",
    "lat": 22.696,
    "lng": 88.46,
    "description": "Transit stop at Madhyamgram Chowrasta Xing, Kolkata"
  },
  {
    "id": "hridaypur",
    "name": "Hridaypur",
    "code": "HRI-144",
    "platform": "Hridaypur Platform",
    "lat": 22.68,
    "lng": 88.453,
    "description": "Transit stop at Hridaypur, Kolkata"
  },
  {
    "id": "barasat",
    "name": "Barasat",
    "code": "BAR-145",
    "platform": "Barasat Platform",
    "lat": 22.722,
    "lng": 88.479,
    "description": "Transit stop at Barasat, Kolkata"
  },
  {
    "id": "nager-bazar",
    "name": "Nager Bazar",
    "code": "NAG-146",
    "platform": "Nager Bazar Platform",
    "lat": 22.622,
    "lng": 88.403,
    "description": "Transit stop at Nager Bazar, Kolkata"
  },
  {
    "id": "jessor-road",
    "name": "Jessor Road",
    "code": "JES-147",
    "platform": "Jessor Road Platform",
    "lat": 22.61,
    "lng": 88.41,
    "description": "Transit stop at Jessor Road, Kolkata"
  },
  {
    "id": "patipukur",
    "name": "Patipukur",
    "code": "PAT-148",
    "platform": "Patipukur Platform",
    "lat": 22.618,
    "lng": 88.404,
    "description": "Transit stop at Patipukur, Kolkata"
  },
  {
    "id": "m-g-road",
    "name": "M.G. Road",
    "code": "M-G-149",
    "platform": "M.G. Road Platform",
    "lat": 22.5788,
    "lng": 88.3565,
    "description": "Transit stop at M.G. Road, Kolkata"
  },
  {
    "id": "howrah-maidan",
    "name": "Howrah Maidan",
    "code": "HOW-150",
    "platform": "Howrah Maidan Platform",
    "lat": 22.58,
    "lng": 88.332,
    "description": "Transit stop at Howrah Maidan, Kolkata"
  },
  {
    "id": "kundghat",
    "name": "Kundghat",
    "code": "KUN-151",
    "platform": "Kundghat Platform",
    "lat": 22.494,
    "lng": 88.351,
    "description": "Transit stop at Kundghat, Kolkata"
  },
  {
    "id": "kaikhali",
    "name": "Kaikhali",
    "code": "KAI-152",
    "platform": "Kaikhali Platform",
    "lat": 22.636,
    "lng": 88.43,
    "description": "Transit stop at Kaikhali, Kolkata"
  },
  {
    "id": "durganagar",
    "name": "Durganagar",
    "code": "DUR-153",
    "platform": "Durganagar Platform",
    "lat": 22.650497,
    "lng": 88.419215,
    "description": "Transit stop at Durganagar, Kolkata"
  },
  {
    "id": "park-circus",
    "name": "Park Circus",
    "code": "PAR-154",
    "platform": "Park Circus Platform",
    "lat": 22.545,
    "lng": 88.369,
    "description": "Transit stop at Park Circus, Kolkata"
  },
  {
    "id": "rabindra-tirtha",
    "name": "Rabindra Tirtha",
    "code": "RAB-155",
    "platform": "Rabindra Tirtha Platform",
    "lat": 22.598,
    "lng": 88.465,
    "description": "Transit stop at Rabindra Tirtha, Kolkata"
  },
  {
    "id": "nababpur",
    "name": "Nababpur",
    "code": "NAB-156",
    "platform": "Nababpur Platform",
    "lat": 22.5,
    "lng": 88.352,
    "description": "Transit stop at Nababpur, Kolkata"
  },
  {
    "id": "chiner-park",
    "name": "Chiner Park",
    "code": "CHI-157",
    "platform": "Chiner Park Platform",
    "lat": 22.627,
    "lng": 88.427,
    "description": "Transit stop at Chiner Park, Kolkata"
  },
  {
    "id": "nimta",
    "name": "Nimta",
    "code": "NIM-158",
    "platform": "Nimta Platform",
    "lat": 22.665,
    "lng": 88.398,
    "description": "Transit stop at Nimta, Kolkata"
  },
  {
    "id": "dankuni",
    "name": "Dankuni",
    "code": "DAN-159",
    "platform": "Dankuni Platform",
    "lat": 22.678,
    "lng": 88.29,
    "description": "Transit stop at Dankuni, Kolkata"
  },
  {
    "id": "college-street-mg-road",
    "name": "College Street/MG Road",
    "code": "COL-160",
    "platform": "College Street/MG Road Platform",
    "lat": 22.5764,
    "lng": 88.3627,
    "description": "Transit stop at College Street/MG Road, Kolkata"
  },
  {
    "id": "khardah",
    "name": "Khardah",
    "code": "KHA-161",
    "platform": "Khardah Platform",
    "lat": 22.718,
    "lng": 88.38,
    "description": "Transit stop at Khardah, Kolkata"
  },
  {
    "id": "kamarhati",
    "name": "Kamarhati",
    "code": "KAM-162",
    "platform": "Kamarhati Platform",
    "lat": 22.658,
    "lng": 88.376,
    "description": "Transit stop at Kamarhati, Kolkata"
  },
  {
    "id": "rathtala-more",
    "name": "Rathtala More",
    "code": "RAT-163",
    "platform": "Rathtala More Platform",
    "lat": 22.638,
    "lng": 88.36,
    "description": "Transit stop at Rathtala More, Kolkata"
  },
  {
    "id": "bonhooghly",
    "name": "Bonhooghly",
    "code": "BON-164",
    "platform": "Bonhooghly Platform",
    "lat": 22.648,
    "lng": 88.38,
    "description": "Transit stop at Bonhooghly, Kolkata"
  },
  {
    "id": "tobin-road",
    "name": "Tobin Road",
    "code": "TOB-165",
    "platform": "Tobin Road Platform",
    "lat": 22.638336,
    "lng": 88.375905,
    "description": "Transit stop at Tobin Road, Kolkata"
  },
  {
    "id": "sinthee-more",
    "name": "Sinthee More",
    "code": "SIN-166",
    "platform": "Sinthee More Platform",
    "lat": 22.628,
    "lng": 88.382,
    "description": "Transit stop at Sinthee More, Kolkata"
  },
  {
    "id": "rajballavpara",
    "name": "Rajballavpara",
    "code": "RAJ-167",
    "platform": "Rajballavpara Platform",
    "lat": 22.61,
    "lng": 88.44,
    "description": "Transit stop at Rajballavpara, Kolkata"
  },
  {
    "id": "sovabazar",
    "name": "Sovabazar",
    "code": "SOV-168",
    "platform": "Sovabazar Platform",
    "lat": 22.594,
    "lng": 88.356,
    "description": "Transit stop at Sovabazar, Kolkata"
  },
  {
    "id": "barabazar",
    "name": "Barabazar",
    "code": "BAR-169",
    "platform": "Barabazar Platform",
    "lat": 22.581395,
    "lng": 88.352844,
    "description": "Transit stop at Barabazar, Kolkata"
  },
  {
    "id": "bally-ghat",
    "name": "Bally Ghat",
    "code": "BAL-170",
    "platform": "Bally Ghat Platform",
    "lat": 22.647,
    "lng": 88.345,
    "description": "Transit stop at Bally Ghat, Kolkata"
  },
  {
    "id": "belurmath",
    "name": "Belurmath",
    "code": "BEL-171",
    "platform": "Belurmath Platform",
    "lat": 22.63,
    "lng": 88.348,
    "description": "Transit stop at Belurmath, Kolkata"
  },
  {
    "id": "bhattanagar",
    "name": "Bhattanagar",
    "code": "BHA-172",
    "platform": "Bhattanagar Platform",
    "lat": 22.632748,
    "lng": 88.305477,
    "description": "Transit stop at Bhattanagar, Kolkata"
  },
  {
    "id": "ganganagar",
    "name": "Ganganagar",
    "code": "GAN-173",
    "platform": "Ganganagar Platform",
    "lat": 22.69,
    "lng": 88.53,
    "description": "Transit stop at Ganganagar, Kolkata"
  },
  {
    "id": "bt-college",
    "name": "BT College",
    "code": "BT--174",
    "platform": "BT College Platform",
    "lat": 22.696,
    "lng": 88.376,
    "description": "Transit stop at BT College, Kolkata"
  },
  {
    "id": "mickelnagar",
    "name": "Mickelnagar",
    "code": "MIC-175",
    "platform": "Mickelnagar Platform",
    "lat": 22.68,
    "lng": 88.445,
    "description": "Transit stop at Mickelnagar, Kolkata"
  },
  {
    "id": "birati",
    "name": "Birati",
    "code": "BIR-176",
    "platform": "Birati Platform",
    "lat": 22.628,
    "lng": 88.409,
    "description": "Transit stop at Birati, Kolkata"
  },
  {
    "id": "baguiati",
    "name": "Baguiati",
    "code": "BAG-177",
    "platform": "Baguiati Platform",
    "lat": 22.612,
    "lng": 88.429,
    "description": "Transit stop at Baguiati, Kolkata"
  },
  {
    "id": "kestopur",
    "name": "Kestopur",
    "code": "KES-178",
    "platform": "Kestopur Platform",
    "lat": 22.604,
    "lng": 88.429,
    "description": "Transit stop at Kestopur, Kolkata"
  },
  {
    "id": "bowbazar",
    "name": "Bowbazar",
    "code": "BOW-179",
    "platform": "Bowbazar Platform",
    "lat": 22.5665,
    "lng": 88.3577,
    "description": "Transit stop at Bowbazar, Kolkata"
  },
  {
    "id": "central-avenue",
    "name": "Central Avenue",
    "code": "CEN-180",
    "platform": "Central Avenue Platform",
    "lat": 22.5722,
    "lng": 88.3617,
    "description": "Transit stop at Central Avenue, Kolkata"
  },
  {
    "id": "stand-road",
    "name": "Stand Road",
    "code": "STA-181",
    "platform": "Stand Road Platform",
    "lat": 22.581,
    "lng": 88.345,
    "description": "Transit stop at Stand Road, Kolkata"
  },
  {
    "id": "habra",
    "name": "Habra",
    "code": "HAB-182",
    "platform": "Habra Platform",
    "lat": 22.846,
    "lng": 88.612,
    "description": "Transit stop at Habra, Kolkata"
  },
  {
    "id": "ashoknagar",
    "name": "Ashoknagar",
    "code": "ASH-183",
    "platform": "Ashoknagar Platform",
    "lat": 22.848,
    "lng": 88.665,
    "description": "Transit stop at Ashoknagar, Kolkata"
  },
  {
    "id": "guma",
    "name": "Guma",
    "code": "GUM-184",
    "platform": "Guma Platform",
    "lat": 22.808664,
    "lng": 88.602505,
    "description": "Transit stop at Guma, Kolkata"
  },
  {
    "id": "bira",
    "name": "Bira",
    "code": "BIR-185",
    "platform": "Bira Platform",
    "lat": 22.789751,
    "lng": 88.572234,
    "description": "Transit stop at Bira, Kolkata"
  },
  {
    "id": "duttapukur",
    "name": "Duttapukur",
    "code": "DUT-186",
    "platform": "Duttapukur Platform",
    "lat": 22.758,
    "lng": 88.523,
    "description": "Transit stop at Duttapukur, Kolkata"
  },
  {
    "id": "sec5",
    "name": "Sec5",
    "code": "SEC-187",
    "platform": "Sec5 Platform",
    "lat": 22.572,
    "lng": 88.431,
    "description": "Transit stop at Sec5, Kolkata"
  },
  {
    "id": "narendrapur",
    "name": "Narendrapur",
    "code": "NAR-188",
    "platform": "Narendrapur Platform",
    "lat": 22.424,
    "lng": 88.416,
    "description": "Transit stop at Narendrapur, Kolkata"
  },
  {
    "id": "harinavi",
    "name": "Harinavi",
    "code": "HAR-189",
    "platform": "Harinavi Platform",
    "lat": 22.413,
    "lng": 88.406,
    "description": "Transit stop at Harinavi, Kolkata"
  },
  {
    "id": "baruipur",
    "name": "Baruipur",
    "code": "BAR-190",
    "platform": "Baruipur Platform",
    "lat": 22.356,
    "lng": 88.428,
    "description": "Transit stop at Baruipur, Kolkata"
  },
  {
    "id": "lake-kali-bari",
    "name": "Lake Kali Bari",
    "code": "LAK-191",
    "platform": "Lake Kali Bari Platform",
    "lat": 22.518,
    "lng": 88.354,
    "description": "Transit stop at Lake Kali Bari, Kolkata"
  },
  {
    "id": "mandirtala",
    "name": "Mandirtala",
    "code": "MAN-192",
    "platform": "Mandirtala Platform",
    "lat": 22.569605,
    "lng": 88.317077,
    "description": "Transit stop at Mandirtala, Kolkata"
  },
  {
    "id": "minto-park",
    "name": "Minto Park",
    "code": "MIN-193",
    "platform": "Minto Park Platform",
    "lat": 22.5423,
    "lng": 88.352,
    "description": "Transit stop at Minto Park, Kolkata"
  },
  {
    "id": "beckbagan",
    "name": "Beckbagan",
    "code": "BEC-194",
    "platform": "Beckbagan Platform",
    "lat": 22.533,
    "lng": 88.363,
    "description": "Transit stop at Beckbagan, Kolkata"
  },
  {
    "id": "wipro-more",
    "name": "Wipro More",
    "code": "WIP-195",
    "platform": "Wipro More Platform",
    "lat": 22.573,
    "lng": 88.434,
    "description": "Transit stop at Wipro More, Kolkata"
  },
  {
    "id": "dlf-1",
    "name": "DLF 1",
    "code": "DLF-196",
    "platform": "DLF 1 Platform",
    "lat": 22.6,
    "lng": 88.478,
    "description": "Transit stop at DLF 1, Kolkata"
  },
  {
    "id": "deshapriya-park",
    "name": "Deshapriya Park",
    "code": "DES-197",
    "platform": "Deshapriya Park Platform",
    "lat": 22.517,
    "lng": 88.36,
    "description": "Transit stop at Deshapriya Park, Kolkata"
  },
  {
    "id": "mathpukur",
    "name": "Mathpukur",
    "code": "MAT-198",
    "platform": "Mathpukur Platform",
    "lat": 22.548669,
    "lng": 88.40052,
    "description": "Transit stop at Mathpukur, Kolkata"
  },
  {
    "id": "nicco-park",
    "name": "Nicco Park",
    "code": "NIC-199",
    "platform": "Nicco Park Platform",
    "lat": 22.567,
    "lng": 88.438,
    "description": "Transit stop at Nicco Park, Kolkata"
  },
  {
    "id": "axis-mall",
    "name": "Axis Mall",
    "code": "AXI-200",
    "platform": "Axis Mall Platform",
    "lat": 22.533,
    "lng": 88.34,
    "description": "Transit stop at Axis Mall, Kolkata"
  },
  {
    "id": "shibrampur",
    "name": "Shibrampur",
    "code": "SHI-201",
    "platform": "Shibrampur Platform",
    "lat": 22.482881,
    "lng": 88.27196,
    "description": "Transit stop at Shibrampur, Kolkata"
  },
  {
    "id": "raja-rammohan-roy-rd",
    "name": "Raja Rammohan Roy Rd",
    "code": "RAJ-202",
    "platform": "Raja Rammohan Roy Rd Platform",
    "lat": 22.572,
    "lng": 88.369,
    "description": "Transit stop at Raja Rammohan Roy Rd, Kolkata"
  },
  {
    "id": "sonamukhi-bazar",
    "name": "Sonamukhi Bazar",
    "code": "SON-203",
    "platform": "Sonamukhi Bazar Platform",
    "lat": 22.69,
    "lng": 88.55,
    "description": "Transit stop at Sonamukhi Bazar, Kolkata"
  },
  {
    "id": "mint",
    "name": "Mint",
    "code": "MIN-204",
    "platform": "Mint Platform",
    "lat": 22.5646,
    "lng": 88.3421,
    "description": "Transit stop at Mint, Kolkata"
  },
  {
    "id": "phool-bagan",
    "name": "Phool Bagan",
    "code": "PHO-205",
    "platform": "Phool Bagan Platform",
    "lat": 22.568,
    "lng": 88.372,
    "description": "Transit stop at Phool Bagan, Kolkata"
  },
  {
    "id": "bagpota",
    "name": "Bagpota",
    "code": "BAG-206",
    "platform": "Bagpota Platform",
    "lat": 22.461048,
    "lng": 88.27947,
    "description": "Transit stop at Bagpota, Kolkata"
  },
  {
    "id": "panchanantala",
    "name": "Panchanantala",
    "code": "PAN-207",
    "platform": "Panchanantala Platform",
    "lat": 22.512421,
    "lng": 88.368899,
    "description": "Transit stop at Panchanantala, Kolkata"
  },
  {
    "id": "muchipara-xing",
    "name": "Muchipara Xing",
    "code": "MUC-208",
    "platform": "Muchipara Xing Platform",
    "lat": 22.5673,
    "lng": 88.3597,
    "description": "Transit stop at Muchipara Xing, Kolkata"
  },
  {
    "id": "sealdah-rajabazar-t-d",
    "name": "Sealdah (Rajabazar T.D.)",
    "code": "SEA-209",
    "platform": "Sealdah (Rajabazar T.D.) Platform",
    "lat": 22.572,
    "lng": 88.373,
    "description": "Transit stop at Sealdah (Rajabazar T.D.), Kolkata"
  },
  {
    "id": "shibtala-math",
    "name": "Shibtala Math",
    "code": "SHI-210",
    "platform": "Shibtala Math Platform",
    "lat": 22.545061,
    "lng": 88.37805,
    "description": "Transit stop at Shibtala Math, Kolkata"
  },
  {
    "id": "ananda-palit",
    "name": "Ananda Palit",
    "code": "ANA-211",
    "platform": "Ananda Palit Platform",
    "lat": 22.568,
    "lng": 88.366,
    "description": "Transit stop at Ananda Palit, Kolkata"
  },
  {
    "id": "chitpur-crossing",
    "name": "Chitpur Crossing",
    "code": "CHI-212",
    "platform": "Chitpur Crossing Platform",
    "lat": 22.596,
    "lng": 88.362,
    "description": "Transit stop at Chitpur Crossing, Kolkata"
  },
  {
    "id": "chandi-ghosh-rd",
    "name": "Chandi Ghosh Rd",
    "code": "CHA-213",
    "platform": "Chandi Ghosh Rd Platform",
    "lat": 22.533,
    "lng": 88.351,
    "description": "Transit stop at Chandi Ghosh Rd, Kolkata"
  },
  {
    "id": "sakhar-bazar",
    "name": "Sakhar Bazar",
    "code": "SAK-214",
    "platform": "Sakhar Bazar Platform",
    "lat": 22.492,
    "lng": 88.306,
    "description": "Transit stop at Sakhar Bazar, Kolkata"
  },
  {
    "id": "new-alipore",
    "name": "New Alipore",
    "code": "NEW-215",
    "platform": "New Alipore Platform",
    "lat": 22.506,
    "lng": 88.339,
    "description": "Transit stop at New Alipore, Kolkata"
  },
  {
    "id": "kasba-p-s",
    "name": "Kasba P.S",
    "code": "KAS-216",
    "platform": "Kasba P.S Platform",
    "lat": 22.515,
    "lng": 88.39,
    "description": "Transit stop at Kasba P.S, Kolkata"
  },
  {
    "id": "sukanta-nagar",
    "name": "Sukanta Nagar",
    "code": "SUK-217",
    "platform": "Sukanta Nagar Platform",
    "lat": 22.533,
    "lng": 88.411,
    "description": "Transit stop at Sukanta Nagar, Kolkata"
  },
  {
    "id": "home-town",
    "name": "Home Town",
    "code": "HOM-218",
    "platform": "Home Town Platform",
    "lat": 22.599,
    "lng": 88.475,
    "description": "Transit stop at Home Town, Kolkata"
  },
  {
    "id": "s-ave",
    "name": "S.Ave",
    "code": "S-A-219",
    "platform": "S.Ave Platform",
    "lat": 22.53,
    "lng": 88.363,
    "description": "Transit stop at S.Ave, Kolkata"
  },
  {
    "id": "santoshpur",
    "name": "Santoshpur",
    "code": "SAN-220",
    "platform": "Santoshpur Platform",
    "lat": 22.49,
    "lng": 88.383,
    "description": "Transit stop at Santoshpur, Kolkata"
  },
  {
    "id": "vip-nagar",
    "name": "VIP. Nagar",
    "code": "VIP-221",
    "platform": "VIP. Nagar Platform",
    "lat": 22.504,
    "lng": 88.39,
    "description": "Transit stop at VIP. Nagar, Kolkata"
  },
  {
    "id": "metro-politon-hou-est",
    "name": "Metro politon Hou. Est",
    "code": "MET-222",
    "platform": "Metro politon Hou. Est Platform",
    "lat": 22.506,
    "lng": 88.396,
    "description": "Transit stop at Metro politon Hou. Est, Kolkata"
  },
  {
    "id": "kbkc-more",
    "name": "KBKC More",
    "code": "KBK-223",
    "platform": "KBKC More Platform",
    "lat": 22.5,
    "lng": 88.4,
    "description": "Transit stop at KBKC More, Kolkata"
  },
  {
    "id": "vivekananda-rd",
    "name": "Vivekananda Rd",
    "code": "VIV-224",
    "platform": "Vivekananda Rd Platform",
    "lat": 22.585,
    "lng": 88.366,
    "description": "Transit stop at Vivekananda Rd, Kolkata"
  },
  {
    "id": "colutala-st",
    "name": "Colutala St",
    "code": "COL-225",
    "platform": "Colutala St Platform",
    "lat": 22.5762,
    "lng": 88.35,
    "description": "Transit stop at Colutala St, Kolkata"
  },
  {
    "id": "ballygunge-stn",
    "name": "Ballygunge Stn",
    "code": "BAL-226",
    "platform": "Ballygunge Stn Platform",
    "lat": 22.529,
    "lng": 88.3653,
    "description": "Transit stop at Ballygunge Stn, Kolkata"
  },
  {
    "id": "tata-medical-centre",
    "name": "Tata Medical Centre",
    "code": "TAT-227",
    "platform": "Tata Medical Centre Platform",
    "lat": 22.572,
    "lng": 88.474,
    "description": "Transit stop at Tata Medical Centre, Kolkata"
  },
  {
    "id": "airport-3-no-gate",
    "name": "Airport 3 no. gate",
    "code": "AIR-228",
    "platform": "Airport 3 no. gate Platform",
    "lat": 22.66,
    "lng": 88.455,
    "description": "Transit stop at Airport 3 no. gate, Kolkata"
  },
  {
    "id": "central-jail",
    "name": "Central Jail",
    "code": "CEN-229",
    "platform": "Central Jail Platform",
    "lat": 22.545,
    "lng": 88.34,
    "description": "Transit stop at Central Jail, Kolkata"
  },
  {
    "id": "toll-plaza",
    "name": "Toll Plaza",
    "code": "TOL-230",
    "platform": "Toll Plaza Platform",
    "lat": 22.575,
    "lng": 88.306,
    "description": "Transit stop at Toll Plaza, Kolkata"
  },
  {
    "id": "weble-house",
    "name": "Weble House",
    "code": "WEB-231",
    "platform": "Weble House Platform",
    "lat": 22.57,
    "lng": 88.348,
    "description": "Transit stop at Weble House, Kolkata"
  },
  {
    "id": "silpara",
    "name": "Silpara",
    "code": "SIL-232",
    "platform": "Silpara Platform",
    "lat": 22.487,
    "lng": 88.308,
    "description": "Transit stop at Silpara, Kolkata"
  },
  {
    "id": "dinobandhu-andrews-college",
    "name": "Dinobandhu Andrews College",
    "code": "DIN-233",
    "platform": "Dinobandhu Andrews College Platform",
    "lat": 22.6,
    "lng": 88.38,
    "description": "Transit stop at Dinobandhu Andrews College, Kolkata"
  },
  {
    "id": "bldg-more",
    "name": "Bldg. More",
    "code": "BLD-234",
    "platform": "Bldg. More Platform",
    "lat": 22.562512,
    "lng": 88.408869,
    "description": "Transit stop at Bldg. More, Kolkata"
  },
  {
    "id": "bagbazar",
    "name": "Bagbazar",
    "code": "BAG-235",
    "platform": "Bagbazar Platform",
    "lat": 22.5965,
    "lng": 88.3585,
    "description": "Transit stop at Bagbazar, Kolkata"
  },
  {
    "id": "d-p-sasmal-rd",
    "name": "D.P.Sasmal Rd",
    "code": "D-P-236",
    "platform": "D.P.Sasmal Rd Platform",
    "lat": 22.5,
    "lng": 88.33,
    "description": "Transit stop at D.P.Sasmal Rd, Kolkata"
  },
  {
    "id": "janakalyan",
    "name": "Janakalyan",
    "code": "JAN-237",
    "platform": "Janakalyan Platform",
    "lat": 22.484615,
    "lng": 88.31266,
    "description": "Transit stop at Janakalyan, Kolkata"
  },
  {
    "id": "vivekananda-bridge",
    "name": "Vivekananda Bridge",
    "code": "VIV-238",
    "platform": "Vivekananda Bridge Platform",
    "lat": 22.627,
    "lng": 88.362,
    "description": "Transit stop at Vivekananda Bridge, Kolkata"
  },
  {
    "id": "liluah",
    "name": "Liluah",
    "code": "LIL-239",
    "platform": "Liluah Platform",
    "lat": 22.611,
    "lng": 88.339,
    "description": "Transit stop at Liluah, Kolkata"
  },
  {
    "id": "salkia-chowrastha",
    "name": "Salkia Chowrastha",
    "code": "SAL-240",
    "platform": "Salkia Chowrastha Platform",
    "lat": 22.594,
    "lng": 88.335,
    "description": "Transit stop at Salkia Chowrastha, Kolkata"
  },
  {
    "id": "behala-airport",
    "name": "Behala Airport",
    "code": "BEH-241",
    "platform": "Behala Airport Platform",
    "lat": 22.488,
    "lng": 88.305,
    "description": "Transit stop at Behala Airport, Kolkata"
  },
  {
    "id": "pnb",
    "name": "PNB",
    "code": "PNB-242",
    "platform": "PNB Platform",
    "lat": 22.591282,
    "lng": 88.399502,
    "description": "Transit stop at PNB, Kolkata"
  },
  {
    "id": "bidhannagar-college",
    "name": "Bidhannagar College",
    "code": "BID-243",
    "platform": "Bidhannagar College Platform",
    "lat": 22.585,
    "lng": 88.413,
    "description": "Transit stop at Bidhannagar College, Kolkata"
  },
  {
    "id": "city-centre-1-bhavans",
    "name": "City Centre 1/Bhavans",
    "code": "CIT-244",
    "platform": "City Centre 1/Bhavans Platform",
    "lat": 22.585,
    "lng": 88.412,
    "description": "Transit stop at City Centre 1/Bhavans, Kolkata"
  },
  {
    "id": "nayabad",
    "name": "Nayabad",
    "code": "NAY-245",
    "platform": "Nayabad Platform",
    "lat": 22.48,
    "lng": 88.399,
    "description": "Transit stop at Nayabad, Kolkata"
  },
  {
    "id": "panchasayar",
    "name": "Panchasayar",
    "code": "PAN-246",
    "platform": "Panchasayar Platform",
    "lat": 22.49,
    "lng": 88.382,
    "description": "Transit stop at Panchasayar, Kolkata"
  },
  {
    "id": "itc-more",
    "name": "ITC More",
    "code": "ITC-247",
    "platform": "ITC More Platform",
    "lat": 22.605,
    "lng": 88.445,
    "description": "Transit stop at ITC More, Kolkata"
  },
  {
    "id": "sanpui-para",
    "name": "Sanpui Para",
    "code": "SAN-248",
    "platform": "Sanpui Para Platform",
    "lat": 22.47,
    "lng": 88.29,
    "description": "Transit stop at Sanpui Para, Kolkata"
  },
  {
    "id": "anwar-shah-rd",
    "name": "Anwar Shah Rd",
    "code": "ANW-249",
    "platform": "Anwar Shah Rd Platform",
    "lat": 22.506,
    "lng": 88.354,
    "description": "Transit stop at Anwar Shah Rd, Kolkata"
  },
  {
    "id": "tegharia",
    "name": "Tegharia",
    "code": "TEG-250",
    "platform": "Tegharia Platform",
    "lat": 22.607,
    "lng": 88.438,
    "description": "Transit stop at Tegharia, Kolkata"
  },
  {
    "id": "appolo-hospital",
    "name": "Appolo Hospital",
    "code": "APP-251",
    "platform": "Appolo Hospital Platform",
    "lat": 22.575,
    "lng": 88.418,
    "description": "Transit stop at Appolo Hospital, Kolkata"
  },
  {
    "id": "bengal-chemical",
    "name": "Bengal Chemical",
    "code": "BEN-252",
    "platform": "Bengal Chemical Platform",
    "lat": 22.493,
    "lng": 88.405,
    "description": "Transit stop at Bengal Chemical, Kolkata"
  },
  {
    "id": "raghunathpur",
    "name": "Raghunathpur",
    "code": "RAG-253",
    "platform": "Raghunathpur Platform",
    "lat": 22.409398,
    "lng": 88.37909,
    "description": "Transit stop at Raghunathpur, Kolkata"
  }
];

export const BUS_ROUTES: BusRoute[] = [
  {
    "id": "route_3",
    "number": "3",
    "name": "Dahighat – Sealdah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "dahighat",
      "khidderpur",
      "mominpur",
      "hazra",
      "elgin-road",
      "park-street",
      "esplanade",
      "subod-mallick-squre",
      "moulali",
      "sealdah"
    ],
    "baseFare": 7,
    "farePerStop": 1.44
  },
  {
    "id": "route_15",
    "number": "15",
    "name": "Ultadanga – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "ultadanga",
      "khanna",
      "hatibagan",
      "grey-st",
      "nimtala-ghat-st",
      "b-k-paul-ave",
      "howrah-bridge-east",
      "howrah-stn",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 1.63
  },
  {
    "id": "route_33",
    "number": "33",
    "name": "Chetla – Paikpara",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "chetla",
      "paikpara",
      "shyambazar",
      "khanna",
      "manicktala",
      "sealdha",
      "moulali",
      "padmapukur",
      "darga-rd",
      "bondel-gate",
      "hazra",
      "kalighat",
      "alipur-rd",
      "chetla",
      "paikpara"
    ],
    "baseFare": 7,
    "farePerStop": 0.93
  },
  {
    "id": "route_7a",
    "number": "7A",
    "name": "Sarsuna – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "sarsuna",
      "bakultala",
      "chowrasta",
      "manton-xing",
      "behala-tram-depot",
      "taratala-xing",
      "mominpur",
      "khidderpur",
      "casurina-ave",
      "esplanade",
      "b-b-d-bag",
      "howrah-stn",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 1.08
  },
  {
    "id": "route_11a",
    "number": "11A",
    "name": "Dum Dum – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "dum-dum",
      "dum-dum-stn",
      "chria",
      "shyambazar",
      "manicktala",
      "bedon-squre",
      "howrah-bridge-east",
      "howrah-stn",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 1.63
  },
  {
    "id": "route_14a",
    "number": "14A",
    "name": "Bichalighat – Bikash Bhavan",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "bichalighat",
      "hmg-college-metiabruj",
      "halder-para",
      "abestors-more",
      "ramnagar-more",
      "dockyard",
      "khidderpur",
      "fancy-market",
      "hastings",
      "j-k-island",
      "mayo-rd",
      "esplanade",
      "subod-mallick-squre",
      "moulali",
      "sealdah",
      "cannel-bridge",
      "rashmoni-bazar",
      "jora-mandir",
      "beliaghata-main-road",
      "central-park",
      "karunamoyee",
      "unnayan-bhavan",
      "bikash-bhavan"
    ],
    "baseFare": 7,
    "farePerStop": 0.59
  },
  {
    "id": "route_5_n",
    "number": "5-N",
    "name": "Garia – Nabanna",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "garia",
      "ganguli-bagan",
      "baghajatin",
      "jadavpur",
      "dhakuria",
      "golpark",
      "d-park",
      "r-b-ave",
      "hazra",
      "elgin-road",
      "exide",
      "p-t-s",
      "nabanna"
    ],
    "baseFare": 7,
    "farePerStop": 1.08
  },
  {
    "id": "route_6_n",
    "number": "6-N",
    "name": "Garia – Nabanna",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "garia",
      "naktala",
      "regentpark",
      "ranikhuti",
      "tollygunge-metro",
      "tollygunge-phari",
      "r-b-ave",
      "hazra",
      "elgin-road",
      "exide",
      "p-t-s",
      "nabanna"
    ],
    "baseFare": 7,
    "farePerStop": 1.18
  },
  {
    "id": "route_12n",
    "number": "12N",
    "name": "Thakurpukur – Nabanna",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "thakurpukur",
      "d-h-road",
      "taratala-xing",
      "mominpur",
      "khidderpur",
      "hastings",
      "vidhya-sagar-satu",
      "nabanna"
    ],
    "baseFare": 7,
    "farePerStop": 1.86
  },
  {
    "id": "route_ac_1",
    "number": "AC-1",
    "name": "Jadavpore – Howrah",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "jadavpur",
      "prince-a-saha-rd",
      "tollygunge-phari",
      "hazra",
      "elgin-road",
      "esplanade",
      "howrah"
    ],
    "baseFare": 15,
    "farePerStop": 5.83
  },
  {
    "id": "route_ac_4",
    "number": "AC-4",
    "name": "Parnasree – Howrah",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "parnasree",
      "taratala-xing",
      "mominpur",
      "khidderpur",
      "hastings",
      "p-t-s",
      "park-street",
      "esplanade",
      "b-b-d-bag",
      "howrah-bridge-south",
      "howrah"
    ],
    "baseFare": 15,
    "farePerStop": 3.5
  },
  {
    "id": "route_ac_4b",
    "number": "AC-4B",
    "name": "Joka – New Town",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "joka",
      "thakurpukur",
      "cancer-hospital",
      "kabardanga",
      "haridevpur",
      "karunamoyee",
      "tollygunge-metro",
      "r-b-ave",
      "gariahat",
      "ruby",
      "chingrihata",
      "sdf",
      "college-more",
      "technopolis",
      "new-town"
    ],
    "baseFare": 15,
    "farePerStop": 2.5
  },
  {
    "id": "route_ac_5",
    "number": "AC-5",
    "name": "Garia – Howrah",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "garia",
      "raipur-club",
      "baghajatin",
      "jadavpur",
      "golpark",
      "gariahat",
      "r-b-ave",
      "hazra",
      "chakraberia",
      "elgin-road",
      "birla-taramondal",
      "park-street",
      "esplanade",
      "b-b-d-bag",
      "howrah-bridge-east",
      "howrah"
    ],
    "baseFare": 15,
    "farePerStop": 2.33
  },
  {
    "id": "route_ac_6",
    "number": "AC-6",
    "name": "Garia – Howrah",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "garia",
      "howrah-stn",
      "howrah-bridge-east",
      "b-b-d-bag",
      "esplanade",
      "park-street",
      "elgin-road",
      "hazra",
      "r-b-ave",
      "tollygunge-phari",
      "tollygunge-metro",
      "ranikhuti",
      "regentpark",
      "naktala",
      "garia",
      "howrah"
    ],
    "baseFare": 15,
    "farePerStop": 2.33
  },
  {
    "id": "route_ac_9",
    "number": "AC-9",
    "name": "Jadavpore – Karunamoyee",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "jadavpur",
      "ajoynagar",
      "ruby",
      "chingrihata",
      "beliaghata-main-road",
      "central-park",
      "karunamoyee"
    ],
    "baseFare": 15,
    "farePerStop": 5.83
  },
  {
    "id": "route_ac_9b",
    "number": "AC-9B",
    "name": "Jadavpore – Eco Space",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "jadavpur",
      "sukanta-setu",
      "ajoynagar",
      "e-m-byepass",
      "sc-city",
      "chingrihata",
      "sdf",
      "college-more",
      "new-town",
      "narkel-bagan",
      "eco-space"
    ],
    "baseFare": 15,
    "farePerStop": 3.5
  },
  {
    "id": "route_ac_12",
    "number": "AC-12",
    "name": "New Town (Sapoorji) – Howrah",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "narkel-bagan",
      "new-town",
      "sdf",
      "chingrihata",
      "sc-city",
      "topsia",
      "exide",
      "esplanade",
      "b-b-d-bag",
      "howrah"
    ],
    "baseFare": 15,
    "farePerStop": 3.89
  },
  {
    "id": "route_ac_12d",
    "number": "AC-12D",
    "name": "Joka – Howrah",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "joka",
      "thakurpukur",
      "chowrasta",
      "mominpur",
      "zoo",
      "p-t-s",
      "esplanade",
      "mission-row-xing",
      "b-b-d-bag",
      "howrah"
    ],
    "baseFare": 15,
    "farePerStop": 3.89
  },
  {
    "id": "route_ac_20",
    "number": "AC-20",
    "name": "Santragachi – Barrackpore",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "santragachi",
      "p-t-s",
      "esplanade",
      "cr-avenue",
      "shyambazar",
      "bt-road",
      "dunlop",
      "sodpur",
      "titagarh",
      "barrackpore"
    ],
    "baseFare": 15,
    "farePerStop": 3.89
  },
  {
    "id": "route_ac_23a",
    "number": "AC-23A",
    "name": "Salt Lake Depot Gate – Rajchandrapur",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "salt-lake-depot-gate",
      "college-more",
      "new-town",
      "narkel-bagan",
      "eco-space",
      "aliah-university",
      "daber-more",
      "eco-park",
      "city-centre-ii",
      "haldiram",
      "airport-gate-no-1",
      "belghoria-exp-way",
      "dakshineswar",
      "ballyhalt",
      "rajchandrapur"
    ],
    "baseFare": 15,
    "farePerStop": 2.5
  },
  {
    "id": "route_ac_24",
    "number": "AC-24",
    "name": "Patuli – Howrah",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "patuli",
      "ruby",
      "gariahat",
      "hazra",
      "exide",
      "park-street",
      "esplanade",
      "howrah"
    ],
    "baseFare": 15,
    "farePerStop": 5
  },
  {
    "id": "route_ac_24a",
    "number": "AC-24A",
    "name": "Kamalgazi – Howrah Station",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "kamalgazi",
      "dhalai-bridge",
      "patuli",
      "peerless-hospital",
      "ajoynagar",
      "kalikapur",
      "ruby",
      "gariahat",
      "r-b-ave",
      "hazra-park",
      "p-t-s",
      "park-street",
      "esplanade",
      "b-b-d-bag",
      "howrah-bridge-east",
      "howrah-stn"
    ],
    "baseFare": 15,
    "farePerStop": 2.33
  },
  {
    "id": "route_ac_30",
    "number": "AC-30",
    "name": "Lake Town (Jaya Cinema) – Howrah Station",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "lake-town-jaya-cinema",
      "hudco-ultadanga",
      "kankurgachi",
      "manicktala",
      "girish-park-c-r-avn-xing-m-g-road-xing",
      "barrabazar",
      "howrah-stn"
    ],
    "baseFare": 15,
    "farePerStop": 5.83
  },
  {
    "id": "route_ac_30s_it_spl",
    "number": "AC-30S (IT Spl.)",
    "name": "Ultadanga – Sapoorji",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "ultadanga",
      "kadapara-beliaghata-xing",
      "chingrihata",
      "sdf",
      "college-more",
      "new-town",
      "narkel-bagan",
      "sapoorji"
    ],
    "baseFare": 15,
    "farePerStop": 5
  },
  {
    "id": "route_ac_31",
    "number": "AC-31",
    "name": "Behala Chowrastha – Jadavpur",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "chowrasta",
      "james-long-sarani",
      "ramkrishna-ashram",
      "siriti-more",
      "karunamoyee",
      "lake-gardens",
      "jadavpur"
    ],
    "baseFare": 15,
    "farePerStop": 5.83
  },
  {
    "id": "route_ac_37",
    "number": "AC-37",
    "name": "Garia – Barasat",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "garia",
      "patuli",
      "ruby",
      "sc-city",
      "chingrihata",
      "hudco-ultadanga",
      "v-i-p-road",
      "airport",
      "doltala",
      "madhyamgram-chowrasta-xing",
      "hridaypur",
      "barasat"
    ],
    "baseFare": 15,
    "farePerStop": 3.18
  },
  {
    "id": "route_ac_40",
    "number": "AC-40",
    "name": "Airport Gate No. 1 – Howrah Maidan",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "airport-gate-no-1",
      "nager-bazar",
      "jessor-road",
      "lake-town-jaya-cinema",
      "patipukur",
      "shyambazar",
      "girish-park-c-r-avn-xing-m-g-road-xing",
      "m-g-road",
      "barrabazar",
      "howrah-stn",
      "howrah-maidan"
    ],
    "baseFare": 15,
    "farePerStop": 3.5
  },
  {
    "id": "route_ac_47",
    "number": "AC-47",
    "name": "Kundghat – Sapoorji",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "kundghat",
      "tollygunge-metro",
      "r-b-ave",
      "gariahat",
      "ruby",
      "sc-city",
      "chingrihata",
      "unnayan-bhavan",
      "sdf",
      "new-town",
      "narkel-bagan",
      "sapoorji"
    ],
    "baseFare": 15,
    "farePerStop": 3.18
  },
  {
    "id": "route_ac_50a",
    "number": "AC-50A",
    "name": "Garia – Rajchandrapur",
    "type": "AC Express",
    "color": "#2563eb",
    "bgBadge": "bg-blue-100 dark:bg-blue-950",
    "textBadge": "text-blue-700 dark:text-blue-300",
    "stops": [
      "garia",
      "patuli",
      "e-m-byepass",
      "sc-city",
      "chingrihata",
      "hudco-ultadanga",
      "v-i-p-road",
      "kaikhali",
      "airport-gate-no-1",
      "durganagar",
      "belghoria-exp-way",
      "dakshineswar",
      "ballyhalt",
      "rajchandrapur"
    ],
    "baseFare": 15,
    "farePerStop": 2.69
  },
  {
    "id": "route_c23",
    "number": "C23",
    "name": "Park Circus – Dankuni",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "park-circus",
      "sc-city",
      "chingrihata",
      "sdf",
      "technopolis",
      "rabindra-tirtha",
      "nababpur",
      "chiner-park",
      "airport",
      "durganagar",
      "nimta",
      "dakshineswar",
      "ballyhalt",
      "rajchandrapur",
      "dankuni"
    ],
    "baseFare": 7,
    "farePerStop": 0.93
  },
  {
    "id": "route_c24",
    "number": "C24",
    "name": "Rajabazar – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "rashmoni-bazar",
      "college-street-mg-road",
      "b-b-d-bag",
      "barrabazar",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 3.25
  },
  {
    "id": "route_c28",
    "number": "C28",
    "name": "Barrackpur – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "barrackpore",
      "titagarh",
      "khardah",
      "sodpur",
      "kamarhati",
      "rathtala-more",
      "dunlop",
      "bonhooghly",
      "tobin-road",
      "sinthee-more",
      "chria",
      "shyambazar",
      "rajballavpara",
      "sovabazar",
      "girish-park-c-r-avn-xing-m-g-road-xing",
      "m-g-road",
      "barabazar",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 0.76
  },
  {
    "id": "route_c31",
    "number": "C31",
    "name": "Karunamoyee – Bhattanagar",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "karunamoyee",
      "sdf",
      "technopolis",
      "rabindra-tirtha",
      "nababpur",
      "chiner-park",
      "airport",
      "durganagar",
      "nimta",
      "dakshineswar",
      "bally-ghat",
      "belurmath",
      "bhattanagar"
    ],
    "baseFare": 7,
    "farePerStop": 1.08
  },
  {
    "id": "route_c42",
    "number": "C42",
    "name": "Ganganagar – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "ganganagar",
      "bt-college",
      "mickelnagar",
      "birati",
      "airport-gate-no-1",
      "kaikhali",
      "baguiati",
      "kestopur",
      "lake-town-jaya-cinema",
      "ultadanga",
      "kankurgachi",
      "manicktala",
      "rashmoni-bazar",
      "sealdha",
      "b-b-d-bag",
      "bowbazar",
      "central-avenue",
      "b-b-d-bag",
      "stand-road",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 0.68
  },
  {
    "id": "route_c43",
    "number": "C43",
    "name": "Habra – Garia",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "habra",
      "ashoknagar",
      "guma",
      "bira",
      "duttapukur",
      "barasat",
      "madhyamgram-chowrasta-xing",
      "airport-gate-no-1",
      "chiner-park",
      "eco-park",
      "narkel-bagan",
      "new-town",
      "sec5",
      "chingrihata",
      "sc-city",
      "ruby",
      "ajoynagar",
      "peerless-hospital",
      "patuli",
      "garia"
    ],
    "baseFare": 7,
    "farePerStop": 0.68
  },
  {
    "id": "route_c48",
    "number": "C48",
    "name": "Barasat/Ecospace – Baruipur",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "barasat",
      "madhyamgram-chowrasta-xing",
      "airport-gate-no-1",
      "chiner-park",
      "eco-park",
      "aliah-university",
      "eco-space",
      "narkel-bagan",
      "new-town",
      "sec5",
      "chingrihata",
      "sc-city",
      "ruby",
      "ajoynagar",
      "peerless-hospital",
      "patuli",
      "garia",
      "narendrapur",
      "harinavi",
      "padmapukur",
      "baruipur"
    ],
    "baseFare": 7,
    "farePerStop": 0.65
  },
  {
    "id": "route_e_1",
    "number": "E-1",
    "name": "Jadavpore – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "jadavpur",
      "dhakuria",
      "golpark",
      "lake-kali-bari",
      "r-b-ave",
      "hazra",
      "elgin-road",
      "p-t-s",
      "park-street",
      "esplanade",
      "b-b-d-bag",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 1.18
  },
  {
    "id": "route_e_4",
    "number": "E-4",
    "name": "Parnasree – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "parnasree",
      "taratala-xing",
      "mominpur",
      "khidderpur",
      "casurina-ave",
      "esplanade",
      "b-b-d-bag",
      "howrah-bridge-east",
      "howrah-stn",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 1.44
  },
  {
    "id": "route_eb1",
    "number": "EB1",
    "name": "Nabanna – Newtown",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "nabanna",
      "mandirtala",
      "vidhya-sagar-satu",
      "p-t-s",
      "minto-park",
      "beckbagan",
      "park-circus",
      "sc-city",
      "chingrihata",
      "wipro-more",
      "college-more",
      "dlf-1",
      "new-town"
    ],
    "baseFare": 7,
    "farePerStop": 1.08
  },
  {
    "id": "route_eb3",
    "number": "EB3",
    "name": "Tollygunge – Eco space",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "tollygunge-metro",
      "r-b-ave",
      "deshapriya-park",
      "gariahat",
      "ruby",
      "sc-city",
      "mathpukur",
      "chingrihata",
      "nicco-park",
      "wipro-more",
      "sdf",
      "college-more",
      "dlf-1",
      "new-town",
      "axis-mall",
      "narkel-bagan",
      "dlf-1",
      "eco-space"
    ],
    "baseFare": 7,
    "farePerStop": 0.76
  },
  {
    "id": "route_m_7b",
    "number": "M-7B",
    "name": "Shibrampur – Howrah Station",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "shibrampur",
      "bakultala",
      "chowrasta",
      "raja-rammohan-roy-rd",
      "karunamoyee",
      "tollygunge-metro",
      "r-b-ave",
      "exide",
      "park-street",
      "esplanade",
      "mission-row-xing",
      "howrah-stn"
    ],
    "baseFare": 7,
    "farePerStop": 1.18
  },
  {
    "id": "route_m_7d",
    "number": "M-7D",
    "name": "Sonamukhi Bazar – Kankurgachi",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "sonamukhi-bazar",
      "sarsuna",
      "chowrasta",
      "behala-tram-depot",
      "taratala-xing",
      "mint",
      "mominpur",
      "ganganagar",
      "hazra",
      "elgin-road",
      "park-street",
      "esplanade",
      "subod-mallick-squre",
      "moulali",
      "sealdah",
      "cannel-bridge",
      "rashmoni-bazar",
      "beliaghata-main-road",
      "phool-bagan",
      "kankurgachi"
    ],
    "baseFare": 7,
    "farePerStop": 0.68
  },
  {
    "id": "route_m_7e",
    "number": "M-7E",
    "name": "Bagpota – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "bagpota",
      "kestopur",
      "sarsuna",
      "chowrasta",
      "taratala-xing",
      "mominpur",
      "khidderpur",
      "casurina-ave",
      "esplanade",
      "b-b-d-bag",
      "howrah-bridge-east",
      "howrah-stn",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 1.08
  },
  {
    "id": "route_m_7k",
    "number": "M-7K",
    "name": "Khudiram Park (Sarsuna) – Sealdah (Rajabazar T.D.)",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "sarsuna",
      "chowrasta",
      "panchanantala",
      "muchipara-xing",
      "karunamoyee",
      "tollygunge-metro",
      "r-b-ave",
      "park-street",
      "esplanade",
      "moulali",
      "sealdah-rajabazar-t-d"
    ],
    "baseFare": 7,
    "farePerStop": 1.3
  },
  {
    "id": "route_m_24",
    "number": "M-24",
    "name": "Shibtala Math – Howrah Station",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "shibtala-math",
      "beliaghata-main-road",
      "ananda-palit",
      "moulali",
      "sealdah",
      "m-g-road",
      "college-street-mg-road",
      "barrabazar",
      "howrah-stn"
    ],
    "baseFare": 7,
    "farePerStop": 1.63
  },
  {
    "id": "route_midi_1",
    "number": "MIDI-1",
    "name": "Howrah Maidan – Rajabazar Tram Depot",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "howrah-maidan",
      "howrah-stn",
      "barrabazar",
      "chitpur-crossing",
      "m-g-road",
      "college-street-mg-road",
      "sealdah",
      "rashmoni-bazar"
    ],
    "baseFare": 7,
    "farePerStop": 1.86
  },
  {
    "id": "route_s_2",
    "number": "S-2",
    "name": "Kundghat – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "kundghat",
      "chandi-ghosh-rd",
      "tollygunge-metro",
      "tollygunge-phari",
      "r-b-ave",
      "hazra",
      "elgin-road",
      "esplanade",
      "b-b-d-bag",
      "howrah-bridge-east",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 1.3
  },
  {
    "id": "route_s_3w",
    "number": "S-3W",
    "name": "Joka – Eco Space",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "joka",
      "thakurpukur",
      "sakhar-bazar",
      "chowrasta",
      "behala-tram-depot",
      "taratala-xing",
      "new-alipore",
      "chetla",
      "r-b-ave",
      "gariahat",
      "kasba-p-s",
      "ruby",
      "v-i-p-road",
      "sc-city",
      "chingrihata",
      "sukanta-nagar",
      "nicco-park",
      "sdf",
      "college-more",
      "technopolis",
      "new-town",
      "home-town",
      "narkel-bagan",
      "eco-space",
      "aliah-university",
      "eco-space"
    ],
    "baseFare": 7,
    "farePerStop": 0.52
  },
  {
    "id": "route_s_4c",
    "number": "S-4C",
    "name": "Haridebpur – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "haridevpur",
      "karunamoyee",
      "tollygunge-metro",
      "tollygunge-phari",
      "r-b-ave",
      "hazra",
      "p-t-s",
      "park-street",
      "esplanade",
      "b-b-d-bag",
      "howrah-bridge-east",
      "howrah-stn",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 1.08
  },
  {
    "id": "route_s_5",
    "number": "S-5",
    "name": "Garia – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "garia",
      "ganguli-bagan",
      "baghajatin",
      "jadavpur",
      "dhakuria",
      "golpark",
      "s-ave",
      "d-park",
      "r-b-ave",
      "hazra",
      "elgin-road",
      "park-street",
      "esplanade",
      "b-b-d-bag",
      "barrabazar",
      "howrah-stn",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 0.81
  },
  {
    "id": "route_s_7",
    "number": "S-7",
    "name": "Garia – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "garia",
      "naktala",
      "regentpark",
      "ranikhuti",
      "tollygunge-metro",
      "tollygunge-phari",
      "r-b-ave",
      "hazra",
      "elgin-road",
      "park-street",
      "esplanade",
      "b-b-d-bag",
      "howrah-bridge-east",
      "howrah-stn",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 0.93
  },
  {
    "id": "route_s_9",
    "number": "S-9",
    "name": "Jadavpore – Karunamoyee",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "jadavpur",
      "sukanta-setu",
      "santoshpur",
      "ruby",
      "vip-nagar",
      "sc-city",
      "metro-politon-hou-est",
      "e-m-byepass",
      "kbkc-more",
      "central-park",
      "karunamoyee"
    ],
    "baseFare": 7,
    "farePerStop": 1.3
  },
  {
    "id": "route_s_9a",
    "number": "S-9A",
    "name": "Dunlop – Ballygunge",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "dunlop",
      "tobin-road",
      "sinthee-more",
      "chria",
      "shyambazar",
      "grey-st",
      "vivekananda-rd",
      "m-g-road",
      "colutala-st",
      "cr-avenue",
      "b-b-d-bag",
      "esplanade",
      "park-street",
      "hazra",
      "r-b-ave",
      "deshapriya-park",
      "gariahat",
      "ballygunge-stn"
    ],
    "baseFare": 7,
    "farePerStop": 0.76
  },
  {
    "id": "route_s_9c",
    "number": "S-9C",
    "name": "Kamalgazi – Eco Space",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "kamalgazi",
      "patuli",
      "peerless-hospital",
      "ajoynagar",
      "kalikapur",
      "ruby",
      "v-i-p-road",
      "sc-city",
      "metro-politon-hou-est",
      "chingrihata",
      "nicco-park",
      "unnayan-bhavan",
      "college-more",
      "technopolis",
      "dlf-1",
      "home-town",
      "narkel-bagan",
      "tata-medical-centre",
      "eco-space"
    ],
    "baseFare": 7,
    "farePerStop": 0.72
  },
  {
    "id": "route_s_10",
    "number": "S-10",
    "name": "Airport – Nabanna",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "airport",
      "airport-3-no-gate",
      "airport-gate-no-1",
      "central-jail",
      "nager-bazar",
      "dum-dum-stn",
      "chria",
      "paikpara",
      "shyambazar",
      "grey-st",
      "vivekananda-rd",
      "m-g-road",
      "colutala-st",
      "bowbazar",
      "esplanade",
      "mayo-rd",
      "p-t-s",
      "toll-plaza",
      "nabanna"
    ],
    "baseFare": 7,
    "farePerStop": 0.72
  },
  {
    "id": "route_s_10a",
    "number": "S-10A",
    "name": "Ballygunge – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "ballygunge-stn",
      "gariahat",
      "deshapriya-park",
      "r-b-ave",
      "hazra",
      "elgin-road",
      "park-street",
      "esplanade",
      "b-b-d-bag",
      "howrah-bridge-east",
      "howrah-stn",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 1.18
  },
  {
    "id": "route_s_12",
    "number": "S-12",
    "name": "New Town – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "new-town",
      "sealdah",
      "weble-house",
      "nicco-park",
      "chingrihata",
      "e-m-byepass",
      "rashmoni-bazar",
      "sealdha",
      "moulali",
      "subod-mallick-squre",
      "esplanade",
      "b-b-d-bag",
      "howrah-bridge-east",
      "howrah-stn",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 0.93
  },
  {
    "id": "route_s_12d",
    "number": "S-12D",
    "name": "Thakurpukur – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "thakurpukur",
      "silpara",
      "chowrasta",
      "manton-xing",
      "khidderpur",
      "casurina-ave",
      "esplanade",
      "b-b-d-bag",
      "howrah-bridge-east",
      "howrah-stn",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 1.3
  },
  {
    "id": "route_s_14",
    "number": "S-14",
    "name": "Garia – Karunamoyee",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "garia",
      "dinobandhu-andrews-college",
      "patuli",
      "peerless-hospital",
      "ajoynagar",
      "kaikhali",
      "ruby",
      "v-i-p-road",
      "sc-city",
      "metro-politon-hou-est",
      "bldg-more",
      "kbkc-more",
      "central-park",
      "karunamoyee"
    ],
    "baseFare": 7,
    "farePerStop": 1
  },
  {
    "id": "route_s_21",
    "number": "S-21",
    "name": "Garia – Baghbazar",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "garia",
      "bagbazar",
      "shyambazar",
      "khanna",
      "hudco-ultadanga",
      "e-m-byepass",
      "ruby",
      "kalikapur",
      "ajoynagar",
      "peerless-hospital",
      "patuli",
      "garia",
      "bagbazar"
    ],
    "baseFare": 7,
    "farePerStop": 1.08
  },
  {
    "id": "route_s_30_it_spl",
    "number": "S-30 (IT.Spl.)",
    "name": "Ultadanga – Eco Space",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "ultadanga",
      "kadapara-beliaghata-xing",
      "chingrihata",
      "nicco-park",
      "sdf",
      "college-more",
      "technopolis",
      "new-town",
      "narkel-bagan",
      "tata-medical-centre",
      "eco-space"
    ],
    "baseFare": 7,
    "farePerStop": 1.3
  },
  {
    "id": "route_s_31",
    "number": "S-31",
    "name": "Jadavpore – Janakalyan",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "jadavpur",
      "chowrasta",
      "james-long-sarani",
      "ramkrishna-ashram",
      "siriti-more",
      "karunamoyee",
      "d-p-sasmal-rd",
      "lake-gardens",
      "jadavpur",
      "janakalyan"
    ],
    "baseFare": 7,
    "farePerStop": 1.44
  },
  {
    "id": "route_s_32a",
    "number": "S-32A",
    "name": "Dunlop – Howrah Station",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "dunlop",
      "dakshineswar",
      "vivekananda-bridge",
      "bally-ghat",
      "belurmath",
      "liluah",
      "salkia-chowrastha",
      "howrah-maidan",
      "howrah-stn"
    ],
    "baseFare": 7,
    "farePerStop": 1.63
  },
  {
    "id": "route_s_47a",
    "number": "S-47A",
    "name": "Behala Airport – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "behala-airport",
      "parnasree",
      "taratala-xing",
      "mominpur",
      "khidderpur",
      "casurina-ave",
      "esplanade",
      "b-b-d-bag",
      "howrah-bridge-east",
      "howrah-stn",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 1.3
  },
  {
    "id": "route_s_58",
    "number": "S-58",
    "name": "Barrackpur Court – Karunamoyee",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "barrackpore",
      "titagarh",
      "sodpur",
      "dunlop",
      "sinthee-more",
      "shyambazar",
      "khanna",
      "ultadanga",
      "pnb",
      "bidhannagar-college",
      "city-centre-1-bhavans",
      "karunamoyee"
    ],
    "baseFare": 7,
    "farePerStop": 1.18
  },
  {
    "id": "route_s_5c",
    "number": "S-5C",
    "name": "Nayabad – Howrah",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "nayabad",
      "garia",
      "panchasayar",
      "peerless-hospital",
      "ajoynagar",
      "sukanta-setu",
      "jadavpur",
      "dhakuria",
      "gariahat",
      "d-park",
      "r-b-ave",
      "hazra",
      "elgin-road",
      "park-street",
      "esplanade",
      "b-b-d-bag",
      "howrah-bridge-east",
      "howrah-stn",
      "howrah"
    ],
    "baseFare": 7,
    "farePerStop": 0.72
  },
  {
    "id": "route_s_62",
    "number": "S-62",
    "name": "Patuli – Metiabruz",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "patuli",
      "ruby",
      "kasba-p-s",
      "gariahat",
      "r-b-ave",
      "chetla",
      "mominpur",
      "khidderpur",
      "itc-more",
      "ramnagar-more",
      "hmg-college-metiabruj"
    ],
    "baseFare": 7,
    "farePerStop": 1.3
  },
  {
    "id": "route_st_6",
    "number": "ST-6",
    "name": "Salt Lake – Tollygunge Karunamoyee",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "salt-lake-depot-gate",
      "chingrihata",
      "sc-city",
      "ruby",
      "kalikapur",
      "sanpui-para",
      "jadavpur",
      "anwar-shah-rd",
      "tollygunge-metro"
    ],
    "baseFare": 7,
    "farePerStop": 1.63
  },
  {
    "id": "route_v1",
    "number": "V1",
    "name": "Tollygunge – Airport",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "tollygunge-metro",
      "r-b-ave",
      "gariahat",
      "ballygunge-stn",
      "ruby",
      "sc-city",
      "chingrihata",
      "ultadanga",
      "lake-town-jaya-cinema",
      "kestopur",
      "baguiati",
      "tegharia",
      "kaikhali",
      "airport"
    ],
    "baseFare": 7,
    "farePerStop": 1
  },
  {
    "id": "route_v_1_l",
    "number": "V-1 (L)",
    "name": "Tollygunge – Airport Terminal",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "tollygunge-metro",
      "tollygunge-phari",
      "r-b-ave",
      "gariahat",
      "ruby",
      "v-i-p-road",
      "sc-city",
      "chingrihata",
      "appolo-hospital",
      "bengal-chemical",
      "hudco-ultadanga",
      "jessor-road",
      "raghunathpur",
      "kaikhali",
      "airport"
    ],
    "baseFare": 7,
    "farePerStop": 0.93
  },
  {
    "id": "route_vs_12",
    "number": "VS-12",
    "name": "New Town – Santragachi",
    "type": "Regular",
    "color": "#059669",
    "bgBadge": "bg-emerald-100 dark:bg-emerald-950",
    "textBadge": "text-emerald-700 dark:text-emerald-300",
    "stops": [
      "new-town",
      "santragachi"
    ],
    "baseFare": 7,
    "farePerStop": 13
  }
];

// Road segment coordinate geometry lookup helper
export function getSegmentGeometry(fromStopId: string, toStopId: string): [number, number][] {
  const segKey = `${fromStopId}-${toStopId}`;
  const rawSegments = (roadData as any).segments as Record<string, [number, number][]>;
  if (rawSegments[segKey]) {
    return rawSegments[segKey];
  }
  const revKey = `${toStopId}-${fromStopId}`;
  if (rawSegments[revKey]) {
    return [...rawSegments[revKey]].reverse();
  }
  const stopA = STOPS.find((s) => s.id === fromStopId);
  const stopB = STOPS.find((s) => s.id === toStopId);
  if (stopA && stopB) {
    return [
      [stopA.lat, stopA.lng],
      [stopB.lat, stopB.lng],
    ];
  }
  return [];
}

export function getPathBetweenStops(startStopId: string, destinationStopId: string): [number, number][] {
  const seg = getSegmentGeometry(startStopId, destinationStopId);
  if (seg.length > 0) return seg;

  for (const route of BUS_ROUTES) {
    const sIdx = route.stops.indexOf(startStopId);
    const dIdx = route.stops.indexOf(destinationStopId);
    if (sIdx !== -1 && dIdx !== -1) {
      const fullPath: [number, number][] = [];
      const step = sIdx < dIdx ? 1 : -1;
      for (let i = sIdx; i !== dIdx; i += step) {
        const fromId = route.stops[i];
        const toId = route.stops[i + step];
        const subSeg = getSegmentGeometry(fromId, toId);
        if (fullPath.length === 0) {
          fullPath.push(...subSeg);
        } else {
          fullPath.push(...subSeg.slice(1));
        }
      }
      return fullPath;
    }
  }

  const sA = STOPS.find((s) => s.id === startStopId);
  const sB = STOPS.find((s) => s.id === destinationStopId);
  if (sA && sB) {
    if (sA.lat == null || sA.lng == null || isNaN(Number(sA.lat)) || isNaN(Number(sA.lng))) {
      console.warn(`[Missing Coordinates] Stop "${sA.name}" (${startStopId}) has null or NaN coordinates.`);
      return [];
    }
    if (sB.lat == null || sB.lng == null || isNaN(Number(sB.lat)) || isNaN(Number(sB.lng))) {
      console.warn(`[Missing Coordinates] Stop "${sB.name}" (${destinationStopId}) has null or NaN coordinates.`);
      return [];
    }
    return [
      [sA.lat, sA.lng],
      [sB.lat, sB.lng],
    ];
  }
  return [];
}

export function getUpstreamApproachPath(currentStopId: string, routeId: string): [number, number][] {
  const route = BUS_ROUTES.find((r) => r.id === routeId);
  if (!route) return [];

  const rawApproaches = (roadData as any).approaches as Record<string, [number, number][]>;
  if (rawApproaches && rawApproaches[currentStopId]) {
    return rawApproaches[currentStopId];
  }

  const stopIdx = route.stops.indexOf(currentStopId);
  if (stopIdx > 0) {
    const prevStopId = route.stops[stopIdx - 1];
    const prevSegment = getSegmentGeometry(prevStopId, currentStopId);
    if (prevSegment.length >= 10) {
      return prevSegment.slice(Math.max(0, prevSegment.length - 15));
    }
  }

  const targetStop = STOPS.find((s) => s.id === currentStopId);
  if (targetStop && targetStop.lat != null && targetStop.lng != null && !isNaN(targetStop.lat) && !isNaN(targetStop.lng)) {
    return [
      [targetStop.lat - 0.003, targetStop.lng - 0.002],
      [targetStop.lat - 0.0015, targetStop.lng - 0.001],
      [targetStop.lat, targetStop.lng],
    ];
  }

  return [];
}

export function getRoutePathDistanceKm(route: BusRoute, fromStopId: string, toStopId: string): number {
  const stopsList = route.stops || (route as any).stop_sequence || [];
  const sIdx = stopsList.indexOf(fromStopId);
  const dIdx = stopsList.indexOf(toStopId);
  if (sIdx === -1 || dIdx === -1) return 0;

  const step = sIdx < dIdx ? 1 : -1;
  let totalKm = 0;
  for (let i = sIdx; i !== dIdx; i += step) {
    const sA = stopsList[i];
    const sB = stopsList[i + step];
    const seg = getSegmentGeometry(sA, sB);
    for (let j = 0; j < seg.length - 1; j++) {
      const p1 = seg[j];
      const p2 = seg[j + 1];
      const dLat = (p2[0] - p1[0]) * 111.139;
      const dLng = (p2[1] - p1[1]) * 111.139 * Math.cos(((p1[0] + p2[0]) / 2) * (Math.PI / 180));
      totalKm += Math.hypot(dLat, dLng) / 1000;
    }
  }
  return Math.round(totalKm * 10) / 10;
}

export function getRouteRecommendation(
  currentStopId: string,
  destinationStopId: string,
  availableRoutes: BusRoute[] = BUS_ROUTES,
  availableStops: Stop[] = STOPS
): RouteRecommendation | null {
  const targetDestIds = getAllUnderlyingStopIds(destinationStopId, availableStops);
  const currentStop = availableStops.find((s) => s.id === currentStopId);
  let destStop = availableStops.find((s) => s.id === destinationStopId);
  if (!destStop && targetDestIds.length > 0) {
    destStop = availableStops.find((s) => s.id === targetDestIds[0]);
  }

  if (!currentStop || !destStop) {
    console.error(
      `[Stop Matching Bug] Cannot find origin stop "${currentStopId}" or destination stop "${destinationStopId}" in available stops.`
    );
    return null;
  }

  let matchingRoute: BusRoute | undefined;
  let isDirect = false;
  let secondLegRoute: BusRoute | undefined = undefined;
  let transferStop: Stop | undefined = undefined;
  let matchedDestinationStop: Stop = destStop;

  const directRoutes: { route: BusRoute; stopsCount: number; matchedDestStop: Stop }[] = [];
  for (const route of availableRoutes) {
    const stopsList = route.stops || (route as any).stop_sequence || [];
    const currIdx = stopsList.indexOf(currentStopId);
    let destIdx = -1;
    let matchedDestId = '';
    for (const dId of targetDestIds) {
      const idx = stopsList.indexOf(dId);
      if (idx !== -1) {
        destIdx = idx;
        matchedDestId = dId;
        break;
      }
    }

    if (currIdx !== -1 && destIdx !== -1) {
      const foundStop = availableStops.find((s) => s.id === matchedDestId) || destStop;
      directRoutes.push({
        route,
        stopsCount: Math.abs(destIdx - currIdx),
        matchedDestStop: foundStop,
      });
    }
  }

  if (directRoutes.length > 0) {
    directRoutes.sort((a, b) => a.stopsCount - b.stopsCount);
    matchingRoute = directRoutes[0].route;
    matchedDestinationStop = directRoutes[0].matchedDestStop;
    isDirect = true;
  } else {
    interface TransferOption {
      transferStop: Stop;
      leg1Route: BusRoute;
      leg2Route: BusRoute;
      leg1DistanceKm: number;
      leg2DistanceKm: number;
      totalAlongRouteDistanceKm: number;
      detourScore: number;
      totalStops: number;
      matchedDestStop: Stop;
    }

    const transferCandidates: TransferOption[] = [];

    for (const r1 of availableRoutes) {
      const s1 = r1.stops || (r1 as any).stop_sequence || [];
      const cIdx = s1.indexOf(currentStopId);
      if (cIdx === -1) continue;

      for (const r2 of availableRoutes) {
        if (r1.id === r2.id) continue;
        const s2 = r2.stops || (r2 as any).stop_sequence || [];
        let dIdx = -1;
        let matchedLeg2DestId = '';
        for (const dId of targetDestIds) {
          const idx = s2.indexOf(dId);
          if (idx !== -1) {
            dIdx = idx;
            matchedLeg2DestId = dId;
            break;
          }
        }
        if (dIdx === -1) continue;

        for (const stopId of s1) {
          if (stopId === currentStopId || targetDestIds.includes(stopId)) continue;
          if (s2.includes(stopId)) {
            const tStop = availableStops.find((s) => s.id === stopId);
            if (!tStop) continue;

            const tIdx1 = s1.indexOf(stopId);
            const tIdx2 = s2.indexOf(stopId);

            const leg1Stops = Math.abs(tIdx1 - cIdx);
            const leg2Stops = Math.abs(dIdx - tIdx2);

            const leg2DestStop = availableStops.find((s) => s.id === matchedLeg2DestId) || destStop;

            // Along-route road distances following actual stop sequences
            const leg1DistanceKm = getRoutePathDistanceKm(r1, currentStopId, stopId);
            const leg2DistanceKm = getRoutePathDistanceKm(r2, stopId, matchedLeg2DestId);
            const totalAlongRouteDistanceKm = Math.round((leg1DistanceKm + leg2DistanceKm) * 10) / 10;

            const isHowrahHub = stopId === 'howrah' && currentStopId !== 'howrah' && !targetDestIds.includes('howrah');
            const hubPenalty = isHowrahHub ? 15 : 0;
            // A transfer only counts as a detour if the connecting leg distance is genuinely excessive (> 35km)
            const excessiveDetourPenalty = leg2DistanceKm > 35 ? 50 : 0;

            transferCandidates.push({
              transferStop: tStop,
              leg1Route: r1,
              leg2Route: r2,
              leg1DistanceKm,
              leg2DistanceKm,
              totalAlongRouteDistanceKm,
              detourScore: totalAlongRouteDistanceKm + hubPenalty + excessiveDetourPenalty,
              totalStops: leg1Stops + leg2Stops,
              matchedDestStop: leg2DestStop,
            });
          }
        }
      }
    }

    if (transferCandidates.length > 0) {
      // Rank candidate transfer points by total along-route distance ascending, picking the shortest!
      transferCandidates.sort(
        (a, b) =>
          a.totalAlongRouteDistanceKm - b.totalAlongRouteDistanceKm ||
          a.detourScore - b.detourScore ||
          a.totalStops - b.totalStops
      );
      const best = transferCandidates[0];
      matchingRoute = best.leg1Route;
      secondLegRoute = best.leg2Route;
      transferStop = best.transferStop;
      matchedDestinationStop = best.matchedDestStop;
      isDirect = false;
    } else {
      // Hard check: NO direct route and NO transfer option found!
      console.error(
        `[Stop Matching Bug] No direct route or transfer found between origin "${currentStopId}" and destination "${destinationStopId}". Refusing to return fallback route.`
      );
      return null;
    }
  }

  if (!matchingRoute) {
    return null;
  }

  // HARD CHECK:
  // A direct route must ONLY be returned if BOTH the origin AND destination stop IDs exist in that route's stop_sequence (in either order).
  if (isDirect) {
    const routeStops = matchingRoute.stops || (matchingRoute as any).stop_sequence || [];
    const hasOrigin = routeStops.includes(currentStopId);
    const hasDest = targetDestIds.some((id) => routeStops.includes(id));

    if (!hasOrigin || !hasDest) {
      console.error(
        `[Stop Matching Bug] Direct route "${matchingRoute.number || matchingRoute.id}" does NOT contain both origin "${currentStopId}" (found: ${hasOrigin}) and destination "${destinationStopId}" (found: ${hasDest})! Refusing to return invalid route.`,
        { currentStopId, destinationStopId, routeStops }
      );
      return null;
    }
  } else if (secondLegRoute && transferStop) {
    const leg1Stops = matchingRoute.stops || (matchingRoute as any).stop_sequence || [];
    const leg2Stops = secondLegRoute.stops || (secondLegRoute as any).stop_sequence || [];
    const leg1Valid = leg1Stops.includes(currentStopId) && leg1Stops.includes(transferStop.id);
    const leg2Valid = leg2Stops.includes(transferStop.id) && targetDestIds.some((id) => leg2Stops.includes(id));

    if (!leg1Valid || !leg2Valid) {
      console.error(
        `[Stop Matching Bug] Transfer route legs do not contain required stop sequences for origin "${currentStopId}", transfer "${transferStop.id}", destination "${destinationStopId}"!`,
        { leg1Valid, leg2Valid, leg1Stops, leg2Stops }
      );
      return null;
    }
  } else {
    console.error(
      `[Stop Matching Bug] Attempting to return route recommendation without valid direct or transfer match for origin "${currentStopId}" and destination "${destinationStopId}".`
    );
    return null;
  }

  const path = getPathBetweenStops(currentStopId, matchedDestinationStop.id);
  let distanceKm = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    const dLat = (p2[0] - p1[0]) * 111;
    const dLng = (p2[1] - p1[1]) * 102;
    distanceKm += Math.sqrt(dLat * dLat + dLng * dLng);
  }
  distanceKm = Math.max(2.4, Math.round(distanceKm * 10) / 10);

  const stopsSpan = Math.max(1, Math.round(distanceKm / 2.5));
  const fare = matchingRoute.baseFare + (stopsSpan - 1) * matchingRoute.farePerStop;
  const initialEtaMinutes = 4;
  const approachPath = getUpstreamApproachPath(currentStopId, matchingRoute.id);

  let intermediateStops: Stop[] = [];
  const routeStops = matchingRoute.stops || (matchingRoute as any).stop_sequence || [];
  const cIdx = routeStops.indexOf(currentStopId);
  const dIdx = routeStops.indexOf(matchedDestinationStop.id);
  if (cIdx !== -1 && dIdx !== -1) {
    const minI = Math.min(cIdx, dIdx);
    const maxI = Math.max(cIdx, dIdx);
    const inBetweenIds =
      cIdx < dIdx
        ? routeStops.slice(minI + 1, maxI)
        : [...routeStops.slice(minI + 1, maxI)].reverse();
    intermediateStops = inBetweenIds
      .map((id) => availableStops.find((s) => s.id === id))
      .filter((s): s is Stop => Boolean(s));
  }

  // Road geometry sliced strictly from currentStop to route-specific matchedDestinationStop
  const routeGeom: [number, number][] =
    (matchingRoute as any).road_geometry && (matchingRoute as any).road_geometry.length >= 2
      ? (matchingRoute as any).road_geometry
      : (matchingRoute as any).outboundPath && (matchingRoute as any).outboundPath.length >= 2
      ? (matchingRoute as any).outboundPath
      : (getRouteRoadGeometry(matchingRoute.id) || []);

  const slicedPath =
    routeGeom.length >= 2
      ? sliceRouteRoadGeometry(routeGeom, currentStop, matchedDestinationStop)
      : path;

  return {
    route: matchingRoute,
    currentStop,
    destinationStop: matchedDestinationStop,
    fare,
    initialEtaMinutes,
    stopsRemaining: stopsSpan,
    distanceKm,
    isDirect,
    busNumberPlate: 'WB-04-E-2024',
    crowdLevel: matchingRoute.type === 'AC Express' ? 'Moderate' : 'Crowded',
    pathCoordinates: slicedPath.length >= 2 ? slicedPath : path,
    approachPath,
    intermediateStops,
    transferStop,
    secondLegRoute,
  };
}


export function getRoadNameForCoordinate(lat: number, lng: number): string {
  // 1. High-precision OpenStreetMap arterial road centerline lookup
  try {
    const arterial = snapStopToArterial(lat, lng, { maxSearchRadiusMeters: 450 });
    if (arterial && arterial.roadName && arterial.roadName !== 'Unnamed Arterial' && arterial.distanceShiftMeters <= 400) {
      return arterial.roadName;
    }
  } catch {
    // Fallback to bounding boxes if spatial index not ready
  }

  // 2. Recognized Kolkata major transit corridors
  if (lng > 88.44 && lat > 22.57) return 'Major Arterial Road (New Town)';
  if (lat > 22.59 && lng > 88.40) return 'VIP Road / Jessore Road';
  if (lng > 88.385 && lat < 22.57 && lat > 22.48) return 'Eastern Metropolitan Bypass';
  if (lng < 88.35 && lat > 22.57 && lat < 22.60) return 'Howrah Bridge Approach / Strand Rd';
  if (lng < 88.33 && lat < 22.52) return 'Diamond Harbour Road';
  if (lat > 22.56 && lat < 22.60 && lng > 88.36 && lng < 88.38) return 'APC Road / CIT Road';
  if (lat > 22.55 && lat < 22.59 && lng > 88.35 && lng < 88.37) return 'Central Avenue / Lenin Sarani';
  if (lat > 22.52 && lat < 22.56 && lng > 88.34 && lng < 88.37) return 'AJC Bose Road / Park Street';

  // 3. Fallback to clean station corridor without ugly 'Near Kadapa...' truncation
  let minDist = Infinity;
  let nearestStopName = 'Kolkata Transit Corridor';
  for (const stop of STOPS) {
    const d = Math.hypot(stop.lat - lat, stop.lng - lng);
    if (d < minDist) {
      minDist = d;
      nearestStopName = stop.name;
    }
  }

  if (minDist <= 0.006) {
    const cleanName = nearestStopName.split('/')[0].trim();
    return `${cleanName} Corridor`;
  }

  return 'Kolkata Transit Corridor';
}
