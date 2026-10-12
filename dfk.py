from PIL import Image, ImageDraw

# Create a high-resolution canvas with a white background
width, height = 900, 600
image = Image.new("RGBA", (width, height), (255, 255, 255, 255))
draw = ImageDraw.Draw(image)

# Color palette matching the reference 3D isometric style[cite: 4]
PINK_CAP = (245, 163, 176, 255)
YELLOW_MID = (255, 183, 3, 255)
BLACK_BASE = (26, 26, 26, 255)
BLACK_OUTLINE = (0, 0, 0, 255)
WIRE_COLOR = (0, 0, 0, 200)

def draw_poly(points, fill_color):
    """Helper to draw filled isometric polygons with clean outlines."""
    draw.polygon(points, fill=fill_color, outline=BLACK_OUTLINE, width=2)

def draw_line(p1, p2):
    """Helper to draw wireframe grid lines."""
    draw.line([p1, p2], fill=WIRE_COLOR, width=2)

# ==================== BACK-TO-FRONT DRAWING ORDER ====================

# 1. DIGIT '1' BASE & EXTRUSIONS
# Back-left base block
draw_poly([(60, 350), (110, 320), (110, 420), (60, 450)], BLACK_BASE)
# Front-right base block
draw_poly([(110, 320), (160, 290), (160, 390), (110, 420)], BLACK_BASE)

# Back-left middle block
draw_poly([(60, 230), (110, 200), (110, 320), (60, 350)], YELLOW_MID)
# Front-right middle block
draw_poly([(110, 200), (160, 170), (160, 290), (110, 320)], YELLOW_MID)

# Back-left top cap
draw_poly([(60, 110), (110, 80), (110, 200), (60, 230)], PINK_CAP)
# Front-right top cap
draw_poly([(110, 80), (160, 50), (160, 170), (110, 200)], PINK_CAP)
# Top serif flag
draw_poly([(30, 125), (60, 110), (110, 80), (80, 95)], PINK_CAP)

# '1' Wireframe lines
draw_line((110, 140), (160, 110))
draw_line((110, 260), (160, 230))
draw_line((85, 165), (110, 150))
draw_line((85, 285), (110, 270))


# 2. DECIMAL POINT '.'
# Shifted right by 180px
dx = 190
# Base layer
draw_poly([(50 + dx, 380), (80 + dx, 362), (80 + dx, 402), (50 + dx, 420)], BLACK_BASE)
# Middle layer
draw_poly([(50 + dx, 300), (80 + dx, 282), (80 + dx, 362), (50 + dx, 380)], YELLOW_MID)
# Top layer
draw_poly([(50 + dx, 220), (80 + dx, 202), (80 + dx, 282), (50 + dx, 300)], PINK_CAP)
# Wireframe lines
draw_line((50 + dx, 260), (80 + dx, 242))
draw_line((50 + dx, 340), (80 + dx, 322))


# 3. DIGIT '0' (Hollow 3D Ring)
# Shifted right by 310px
dx2 = 310

# Outer Back Base
draw_poly([(80 + dx2, 390), (180 + dx2, 330), (180 + dx2, 430), (80 + dx2, 490)], BLACK_BASE)
# Outer Front Base
draw_poly([(180 + dx2, 330), (250 + dx2, 290), (250 + dx2, 390), (180 + dx2, 430)], BLACK_BASE)

# Outer Back Middle
draw_poly([(80 + dx2, 270), (180 + dx2, 210), (180 + dx2, 330), (80 + dx2, 390)], YELLOW_MID)
# Outer Front Middle
draw_poly([(180 + dx2, 210), (250 + dx2, 170), (250 + dx2, 290), (180 + dx2, 330)], YELLOW_MID)

# Outer Back Top Cap
draw_poly([(80 + dx2, 150), (180 + dx2, 90), (180 + dx2, 210), (80 + dx2, 270)], PINK_CAP)
# Outer Front Top Cap
draw_poly([(180 + dx2, 90), (250 + dx2, 50), (250 + dx2, 170), (180 + dx2, 210)], PINK_CAP)

# Inner Hollow Core (Back-to-front wall depth)
draw_poly([(130 + dx2, 390), (160 + dx2, 372), (160 + dx2, 432), (130 + dx2, 450)], BLACK_BASE)
draw_poly([(130 + dx2, 270), (160 + dx2, 252), (160 + dx2, 372), (130 + dx2, 390)], YELLOW_MID)
draw_poly([(130 + dx2, 150), (160 + dx2, 132), (160 + dx2, 252), (130 + dx2, 270)], PINK_CAP)

# '0' Wireframe Grid Lines
draw_line((130 + dx2, 210), (160 + dx2, 192))
draw_line((130 + dx2, 330), (160 + dx2, 312))
draw_line((180 + dx2, 150), (250 + dx2, 110))
draw_line((180 + dx2, 270), (250 + dx2, 230))
draw_line((130 + dx2, 210), (180 + dx2, 180))
draw_line((130 + dx2, 330), (180 + dx2, 300))

# Save the final image as a pristine PNG
image.save("1.0_isometric.png")
print("Successfully generated 1.0_isometric.png")