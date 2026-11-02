"""Extract exact room pixels for occlusion; never redraw the room or objects."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
from collections import deque
import numpy as np

folder = Path(__file__).resolve().parents[1] / 'assets' / 'images'
room = Image.open(folder / 'room.png').convert('RGBA')
SCALE = 4

def layer(name, polygons, ellipses=(), lines=()):
    mask = Image.new('L', (room.width*SCALE, room.height*SCALE))
    draw = ImageDraw.Draw(mask)
    for polygon in polygons:
        draw.polygon([(round(x*SCALE),round(y*SCALE)) for x,y in polygon],fill=255)
    for box in ellipses:
        draw.ellipse(tuple(round(v*SCALE) for v in box),fill=255)
    for points,width in lines:
        draw.line([(round(x*SCALE),round(y*SCALE)) for x,y in points],fill=255,width=width*SCALE)
    mask=mask.resize(room.size,Image.Resampling.LANCZOS)
    if name=='robot-dog-front.png':
        # Expand the rough outline, then remove only boundary-connected floor/rug.
        # This retains the original ears, muzzle, paws and fine black outlines.
        mask=mask.filter(ImageFilter.MaxFilter(41))
        crop=(1250,410,1520,715)
        rgb=np.array(room.crop(crop).convert('RGB')).astype('int16')
        r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
        green=(g>r*1.13)&(g>b*1.15)
        coral=(r>100)&(g<180)&(b<145)&(r>g*1.35)&(g>b*1.08)
        white=(rgb.min(axis=2)>195)&(np.ptp(rgb,axis=2)<45)
        eligible=green|coral|white
        h,w=eligible.shape
        outside=np.zeros((h,w),dtype=bool)
        queue=deque([(x,y) for x in range(w) for y in (0,h-1)]+
                    [(x,y) for y in range(h) for x in (0,w-1)])
        while queue:
            x,y=queue.popleft()
            if x<0 or y<0 or x>=w or y>=h or outside[y,x] or not eligible[y,x]:
                continue
            outside[y,x]=True
            queue.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
        alpha=np.array(mask.crop(crop))
        alpha[outside]=0
        # Keep the connected robot silhouette; discard isolated rug markings.
        keep=np.zeros((h,w),dtype=bool)
        queue=deque([(1390-crop[0],560-crop[1])])
        while queue:
            x,y=queue.popleft()
            if x<0 or y<0 or x>=w or y>=h or keep[y,x] or alpha[y,x]<128:
                continue
            keep[y,x]=True
            queue.extend((x+dx,y+dy) for dx in (-1,0,1) for dy in (-1,0,1) if dx or dy)
        edge=np.array(Image.fromarray((keep*255).astype('uint8')).filter(ImageFilter.MaxFilter(3)))>0
        alpha[~edge]=0
        mask=Image.new('L',room.size)
        mask.paste(Image.fromarray(alpha),crop[:2])
    output=room.copy()
    output.putalpha(mask)
    output.save(folder / name)

layer('table-front.png', [[
    (669,247),(674,231),(688,221),(714,211),(755,204),(803,198),
    (900,193),(951,194),(970,199),(985,211),(1007,237),(1045,286),
    (1090,348),(1135,411),(1178,471),(1195,493),(1200,510),(1196,522),
    (1185,533),(1167,541),(1156,763),(1153,772),(1144,778),(1134,778),
    (1123,773),(1119,762),(1116,551),(877,563),(867,776),(864,787),
    (855,795),(845,796),(835,792),(829,782),(825,561),(810,555),
    (797,545),(716,414),(707,542),(703,552),(696,555),(685,552),
    (679,544),(676,345),(671,294)
]])

layer('robot-dog-front.png', [[
    (1367,485),(1367,463),(1367,443),(1370,435),(1378,437),(1394,449),
    (1418,440),(1430,440),(1438,432),(1444,433),(1453,454),(1461,463),
    (1467,480),(1464,492),(1476,495),(1483,500),(1486,510),(1482,520),
    (1472,527),(1451,537),(1461,552),(1466,574),(1462,593),(1457,606),
    (1460,630),(1478,639),(1487,650),(1490,658),(1487,668),(1478,673),
    (1465,673),(1452,667),(1422,648),(1427,663),(1423,678),(1410,687),
    (1397,690),(1382,687),(1367,679),(1358,671),(1352,653),(1339,651),
    (1323,648),(1306,641),(1295,631),(1289,620),(1288,609),(1293,598),
    (1305,582),(1309,567),(1304,550),(1306,537),(1312,525),(1322,517),
    (1338,512),(1355,514),(1361,505)
]], ellipses=[(1276,426,1313,464)], lines=[([(1297,458),(1321,526)],14)])
print('table-front.png and robot-dog-front.png extracted from original room')
