import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, KeepTogether, ListFlowable, ListItem)

SRC = r"C:\Users\Uni\Documents\techgemini-platform\docs\customer\how-it-works-guide.md"
PDF_OUT = r"C:\Users\Uni\Documents\techgemini-platform\docs\customer\SUHAIL-How-It-Works.pdf"

BRAND = HexColor("#1D4ED8")
DARK = HexColor("#0F172A")
GREY = HexColor("#535C6E")
LIGHT = HexColor("#EFF4FB")

with open(SRC, "r", encoding="utf-8") as f:
    lines = f.read().split("\n")

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontName="Helvetica-Bold",
                    fontSize=20, textColor=BRAND, spaceAfter=14, spaceBefore=4)
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontName="Helvetica-Bold",
                    fontSize=15, textColor=DARK, spaceBefore=16, spaceAfter=6)
H3 = ParagraphStyle("H3", parent=styles["Heading3"], fontName="Helvetica-Bold",
                    fontSize=12, textColor=BRAND, spaceBefore=10, spaceAfter=4)
BODY = ParagraphStyle("Body", parent=styles["BodyText"], fontName="Helvetica",
                      fontSize=10.5, leading=15, textColor=DARK, spaceAfter=5)
BLOCK = ParagraphStyle("Block", parent=BODY, fontSize=10, leading=14,
                       textColor=GREY, leftIndent=10, spaceBefore=2, spaceAfter=5)
CELL = ParagraphStyle("Cell", parent=BODY, fontSize=9.5, leading=12.5, spaceAfter=0)
CHEAD = ParagraphStyle("Chead", parent=CELL, fontName="Helvetica-Bold", textColor=HexColor("#FFFFFF"))

def inline(text, style=None):
    # bold **...**
    parts = re.split(r"(\*\*.*?\*\*)", text)
    flowables = []
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            if style is None:
                flowables.append('<b>%s</b>' % part[2:-2])
            else:
                flowables.append('<b>%s</b>' % part[2:-2])
        else:
            flowables.append(part)
    return "".join(flowables)

def P(t, st=BODY):
    return Paragraph(inline(t), st)

story = []
i, n = 0, len(lines)
while i < n:
    line = lines[i].rstrip("\n")
    s = line.strip()
    if s.startswith("# "):
        story.append(Paragraph(inline(s[2:].strip()), H1))
    elif s.startswith("## "):
        story.append(Paragraph(inline(s[3:].strip()), H2))
    elif s.startswith("### "):
        story.append(Paragraph(inline(s[4:].strip()), H3))
    elif s.startswith("> **"):
        story.append(P(s[1:].strip(), BLOCK))
    elif s.startswith(">"):
        story.append(Paragraph(inline(s[1:].strip()), BLOCK))
    elif s.startswith("| "):
        rows = []
        while i < n and lines[i].strip().startswith("|"):
            cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
            if not all(re.fullmatch(r":?-{2,}:?", c) for c in cells):
                rows.append(cells)
            i += 1
        if rows:
            data = []
            for ri, row in enumerate(rows):
                data.append([Paragraph(inline(c), CHEAD if ri == 0 else CELL) for c in row])
            t = Table(data, hAlign="LEFT", repeatRows=1)
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), BRAND),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#FFFFFF"), LIGHT]),
                ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#C7D2E2")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(t)
            story.append(Spacer(1, 8))
        i -= 1
    elif s.startswith("- **") or s.startswith("- "):
        items = []
        while i < n and lines[i].strip().startswith("- "):
            items.append(ListItem(P(lines[i].strip()[2:].strip()), leftIndent=14))
            i += 1
        story.append(ListFlowable(items, bulletType="bullet", bulletColor=BRAND,
                                  bulletFontSize=8, leftIndent=12, spaceAfter=6))
        i -= 1
    elif re.match(r"^\d+\.\s", s):
        items = []
        num = 1
        while i < n and re.match(r"^\d+\.\s", lines[i].strip()):
            items.append(ListItem(P(re.match(r"^\d+\.\s(.*)", lines[i].strip()).group(1)),
                                  leftIndent=14))
            i += 1
        story.append(ListFlowable(items, bulletType="1", bulletColor=BRAND,
                                  leftIndent=12, spaceAfter=6))
        i -= 1
    elif s.startswith("---"):
        story.append(Spacer(1, 6))
    elif s != "":
        story.append(P(s, BODY))
    i += 1

doc = SimpleDocTemplate(PDF_OUT, pagesize=A4,
                        leftMargin=inch, rightMargin=inch,
                        topMargin=inch*0.9, bottomMargin=inch*0.9,
                        title="SUHAIL - How It Works",
                        author="SUHAIL")
doc.build(story)
print("PDF saved:", PDF_OUT)
