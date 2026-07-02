import sys
from pptx import Presentation
prs = Presentation(sys.argv[1])
for i,slide in enumerate(prs.slides):
    print(f"=== slide {i} ===")
    for sh in slide.shapes:
        if sh.has_text_frame:
            t = sh.text_frame.text.strip().replace("\n"," | ")
            if t: print("TXT:", t[:120])
