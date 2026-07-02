import sys
from pptx import Presentation
from pptx.util import Emu
from pptx.enum.shapes import MSO_SHAPE_TYPE

path = sys.argv[1]
prs = Presentation(path)
print(f"FILE: {path}")
print(f"slide_size: {prs.slide_width} x {prs.slide_height} EMU")
print(f"num_slides: {len(prs.slides)}")

# total embedded image parts in the package
img_parts = [p for p in prs.part.package.iter_parts() if 'image' in p.content_type]
print(f"embedded image PARTS in package: {len(img_parts)}")
for ip in img_parts:
    try:
        blob = ip.blob
        print(f"  - {ip.partname}  type={ip.content_type}  bytes={len(blob)}")
    except Exception as e:
        print(f"  - {ip.partname}  type={ip.content_type}  ERR={e}")

total_pics = 0
def walk(shapes, slide_i, depth=0):
    global total_pics
    for sh in shapes:
        st = sh.shape_type
        is_pic = (st == MSO_SHAPE_TYPE.PICTURE) or (st == MSO_SHAPE_TYPE.PLACEHOLDER and getattr(sh,'image',None) is not None)
        if st == MSO_SHAPE_TYPE.GROUP:
            walk(sh.shapes, slide_i, depth+1)
            continue
        if is_pic or st == MSO_SHAPE_TYPE.PICTURE:
            total_pics += 1
            try:
                img = sh.image
                w = img.size[0]; h = img.size[1]
                print(f"  [slide {slide_i}] PICTURE name={sh.name!r} ctype={img.content_type} px={w}x{h} blob_bytes={len(img.blob)} emu_pos=({sh.left},{sh.top}) emu_size=({sh.width},{sh.height})")
            except Exception as e:
                print(f"  [slide {slide_i}] PICTURE name={sh.name!r} (image read error: {e})")

for i, slide in enumerate(prs.slides):
    pic_names = [sh.name for sh in slide.shapes if sh.shape_type==MSO_SHAPE_TYPE.PICTURE]
    print(f"\n--- slide {i}: {len(slide.shapes)} shapes; picture shapes here: {len(pic_names)} ---")
    # list shape types
    from collections import Counter
    c = Counter(str(sh.shape_type) for sh in slide.shapes)
    print("  shape_type counts:", dict(c))
    walk(slide.shapes, i)

print(f"\nTOTAL PICTURE shapes across deck: {total_pics}")
