"""Draw the infographic poster from a fixed spec, for every brand and shape, to look at its typography.
run inside the app container: python /rig/poster_preview.py /data/poster_preview"""
import base64
import os
import sys

from ia_next import illustrated

OUT = sys.argv[1] if len(sys.argv) > 1 else "/data/poster_preview"
os.makedirs(OUT, exist_ok=True)
IDEAS = [("Night shifts drive nurses to leave first", "Hospitals lose night nurses when schedules change with little notice and no say."),
         ("Managers decide who stays", "Nurses who rate their direct manager well stay on their unit through hard quarters."),
         ("Mandatory overtime breaks trust", "Units that rely on mandatory overtime see nurses move to agencies that let them choose."),
         ("New graduates need a preceptor", "A named preceptor in the first months keeps new nurses on the unit past their first year."),
         ("Pay matters less than control", "Nurses weigh control over their hours above a raise when they compare offers."),
         ("Float pools protect core staff", "A staffed float pool covers gaps without pulling unit nurses onto unfamiliar wards."),
         ("Exit interviews arrive too late", "Hospitals that ask nurses about their plans every quarter act before the notice is handed in."),
         ("Magnet units keep their people", "Units that give nurses a voice in practice decisions hold their staff longer than their neighbours.")]
QUOTE = "We do not leave the bedside because of the patients. We leave because nobody asks us before the schedule changes."


PICS = OUT + "/pics"      # illustrations made once by the app's picture engine (scratch gen_pics.py): {brand}-{i}.png


def pic(brand, i):
    try:
        with open(f"{PICS}/{brand}-{i}.png", "rb") as fh:
            return "data:image/png;base64," + base64.b64encode(fh.read()).decode("ascii")
    except OSError:
        return ""


def spec(n, brand="nxt"):
    nodes = [{"label": a, "caption": b, "image": pic(brand, i), "subject": a, "proof": {"quote": QUOTE, "source": "American Nurse Journal"} if i % 2 == 0 else None}
             for i, (a, b) in enumerate(IDEAS[:n])]
    return {"title": "Hospitals keep nurses by giving them control of their hours",
            "subtitle": "What nurse leaders, staff nurses and workforce researchers report across US hospitals this month.",
            "groups": [{"heading": "Nurse retention", "nodes": nodes}],
            "takeaway": "The units that keep their nurses let them shape their own schedules and act before notice is given.",
            "sources": ["American Nurse Journal", "Healthcare Dive", "Becker's Hospital Review", "Health Affairs"]}


for brand in (sys.argv[2].split(",") if len(sys.argv) > 2 else ["nxt", "deciem", "nu"]):
    for shape, n in (("portrait", 8), ("portrait", 5), ("landscape", 6), ("square", 4)):
        png, _ = illustrated.draw(spec(n, brand), brand, shape)
        name = f"{OUT}/{brand}-{shape}-{n}.png"
        with open(name, "wb") as fh:
            fh.write(png)
        print(name, len(png))
