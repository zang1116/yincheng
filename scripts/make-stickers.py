"""从奶蛙 / 大肥鱼原画派生表情贴纸。"""
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC_FROG = ROOT / "图片素材" / "奶蛙.webp"
SRC_FISH = ROOT / "图片素材" / "大肥鱼.webp"
OUT_FROG = ROOT / "www" / "assets" / "stickers" / "naiwa"
OUT_FISH = ROOT / "www" / "assets" / "stickers" / "fish"


def canvas(src, size=512):
    im = Image.open(src).convert("RGBA")
    im.thumbnail((size - 24, size - 24), Image.Resampling.LANCZOS)
    plate = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    plate.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im)
    return plate


def save(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    bg.alpha_composite(im)
    bg.convert("RGB").save(path, "PNG")
    print("wrote", path.name)


def hearts(draw, pts, color=(255, 92, 130, 230)):
    for x, y, r in pts:
        draw.ellipse((x - r, y - r // 2, x, y + r // 2), fill=color)
        draw.ellipse((x, y - r // 2, x + r, y + r // 2), fill=color)
        draw.polygon([(x - r, y), (x + r, y), (x, y + r)], fill=color)


def sparkles(draw, pts, color=(255, 196, 40, 230)):
    for x, y, r in pts:
        draw.line((x - r, y, x + r, y), fill=color, width=4)
        draw.line((x, y - r, x, y + r), fill=color, width=4)


def main():
    frog = canvas(SRC_FROG)
    fish = canvas(SRC_FISH)

    save(frog, OUT_FROG / "think.png")

    happy = frog.copy()
    d = ImageDraw.Draw(happy, "RGBA")
    sparkles(d, [(70, 90, 16), (430, 120, 14), (86, 390, 12), (440, 400, 18)])
    hearts(d, [(120, 70, 14), (400, 80, 12)])
    save(happy, OUT_FROG / "happy.png")

    shy = frog.copy()
    blush = Image.new("RGBA", shy.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(blush, "RGBA")
    bd.ellipse((78, 210, 168, 270), fill=(255, 120, 150, 110))
    bd.ellipse((300, 210, 390, 270), fill=(255, 120, 150, 110))
    shy = Image.alpha_composite(shy, blush.filter(ImageFilter.GaussianBlur(6)))
    save(shy, OUT_FROG / "shy.png")

    sleepy = frog.copy()
    sleepy = ImageEnhance.Color(sleepy).enhance(0.86)
    sleepy = ImageEnhance.Brightness(sleepy).enhance(0.96)
    d = ImageDraw.Draw(sleepy, "RGBA")
    d.arc((400, 36, 470, 106), 200, 340, fill=(90, 120, 190, 230), width=8)
    d.ellipse((430, 118, 444, 132), fill=(90, 120, 190, 200))
    d.ellipse((452, 128, 462, 138), fill=(90, 120, 190, 180))
    save(sleepy, OUT_FROG / "sleepy.png")

    save(fish, OUT_FISH / "hug.png")

    pout = fish.copy()
    d = ImageDraw.Draw(pout, "RGBA")
    d.line((430, 48, 470, 88), fill=(220, 70, 70, 230), width=8)
    d.line((470, 48, 430, 88), fill=(220, 70, 70, 230), width=8)
    d.line((392, 70, 424, 102), fill=(220, 70, 70, 210), width=6)
    d.line((424, 70, 392, 102), fill=(220, 70, 70, 210), width=6)
    save(pout, OUT_FISH / "pout.png")

    eat = fish.copy()
    d = ImageDraw.Draw(eat, "RGBA")
    d.ellipse((36, 360, 150, 430), fill=(255, 250, 245, 240), outline=(180, 140, 90, 255), width=4)
    d.ellipse((52, 372, 134, 412), fill=(255, 248, 230, 255))
    d.polygon([(118, 300), (128, 300), (126, 378), (120, 378)], fill=(210, 170, 90, 255))
    save(eat, OUT_FISH / "eat.png")

    comfort = fish.copy()
    glow = Image.new("RGBA", comfort.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow, "RGBA")
    gd.ellipse((40, 40, 470, 470), fill=(255, 186, 210, 50))
    comfort = Image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(8)), comfort)
    d = ImageDraw.Draw(comfort, "RGBA")
    hearts(d, [(70, 80, 16), (430, 100, 18), (60, 420, 12)], color=(255, 110, 150, 220))
    save(comfort, OUT_FISH / "comfort.png")


if __name__ == "__main__":
    main()
