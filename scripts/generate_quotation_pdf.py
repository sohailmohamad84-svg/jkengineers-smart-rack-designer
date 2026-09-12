import os
import sys
import json
import tempfile
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Footer divider line
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(15 * mm, 12 * mm, 195 * mm, 12 * mm)

        # Footer left text
        self.drawString(15 * mm, 8 * mm, "JK Engineers Works — Industrial & Retail Rack Systems, Mumbai • ISO 9001:2015")

        # Footer right page number
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(195 * mm, 8 * mm, page_text)
        self.restoreState()


def render_floor_plan_image(data, temp_image_path):
    shop = data.get('shop', {})
    length_mm = float(shop.get('lengthMm', 6000))
    breadth_mm = float(shop.get('breadthMm', 4500))
    racks = data.get('racks', [])
    openings = shop.get('openings', [])
    obstacles = shop.get('obstacles', [])

    # Aspect ratio
    aspect = max(0.6, min(2.5, length_mm / max(breadth_mm, 1000)))
    fig_w = 8.0
    fig_h = max(4.0, fig_w / aspect)

    fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=220)
    fig.patch.set_facecolor('#ffffff')
    ax.set_facecolor('#0f172a')

    # Invert Y so (0,0) is top-left matching CAD/web canvas
    ax.set_xlim(-800, length_mm + 800)
    ax.set_ylim(breadth_mm + 800, -800)

    # Outer wall thickness (200mm)
    wall_outer = patches.Rectangle((-200, -200), length_mm + 400, breadth_mm + 400,
                                   linewidth=3, edgecolor='#334155', facecolor='none')
    ax.add_patch(wall_outer)

    # Inner floor
    floor = patches.Rectangle((0, 0), length_mm, breadth_mm,
                              linewidth=2, edgecolor='#64748b', facecolor='#0f172a')
    ax.add_patch(floor)

    # Openings (Doors & Windows)
    for op in openings:
        wall = op.get('wall', 'NORTH')
        dist = float(op.get('distanceMm', 0))
        w = float(op.get('widthMm', 1000))
        is_window = op.get('type') == 'WINDOW'
        color = '#0284c7' if is_window else '#059669'
        label = 'WINDOW' if is_window else 'ENTRANCE'

        if wall == 'NORTH':
            rect = patches.Rectangle((dist, -120), w, 150, facecolor=color, edgecolor='#ffffff', linewidth=1)
            ax.add_patch(rect)
            ax.text(dist + w/2, -45, label, color='white', fontsize=6, fontweight='bold', ha='center', va='center')
        elif wall == 'SOUTH':
            rect = patches.Rectangle((dist, breadth_mm - 30), w, 150, facecolor=color, edgecolor='#ffffff', linewidth=1)
            ax.add_patch(rect)
            ax.text(dist + w/2, breadth_mm + 45, label, color='white', fontsize=6, fontweight='bold', ha='center', va='center')
        elif wall == 'WEST':
            rect = patches.Rectangle((-120, dist), 150, w, facecolor=color, edgecolor='#ffffff', linewidth=1)
            ax.add_patch(rect)
            ax.text(-45, dist + w/2, label, color='white', fontsize=6, fontweight='bold', ha='center', va='center', rotation=90)
        elif wall == 'EAST':
            rect = patches.Rectangle((length_mm - 30, dist), 150, w, facecolor=color, edgecolor='#ffffff', linewidth=1)
            ax.add_patch(rect)
            ax.text(length_mm + 45, dist + w/2, label, color='white', fontsize=6, fontweight='bold', ha='center', va='center', rotation=-90)

    # Obstacles (Pillars)
    for obs in obstacles:
        px = float(obs.get('posX', 0))
        py = float(obs.get('posY', 0))
        ow = float(obs.get('widthMm', 400))
        od = float(obs.get('depthMm', 400))
        rect = patches.Rectangle((px, py), ow, od, facecolor='#d97706', edgecolor='#fef3c7', linewidth=1.5, hatch='//')
        ax.add_patch(rect)
        ax.text(px + ow/2, py + od/2, 'PILLAR', color='#fef3c7', fontsize=6, fontweight='bold', ha='center', va='center')

    # Category Colors
    category_colors = {
        'WALL_RACK': ('#1e3a8a', '#93c5fd'),       # Deep Navy
        'GONDOLA_RACK': ('#0f766e', '#5eead4'),    # Teal
        'END_RACK': ('#b45309', '#fde68a'),        # Amber
        'CHECKOUT_COUNTER': ('#047857', '#6ee7b7'),# Emerald
        'MEDICAL_RACK': ('#4338ca', '#c7d2fe'),    # Indigo
        'GARMENT_RACK': ('#7e22ce', '#f5d0fe'),    # Purple
    }

    # Placed Racks
    for idx, r in enumerate(racks):
        px = float(r.get('posX', 0))
        py = float(r.get('posY', 0))
        rot = int(r.get('rotation', 0))
        w = float(r.get('widthMm', 900))
        d = float(r.get('depthMm', 450))
        is_rotated = rot in (90, 270)
        rw = d if is_rotated else w
        rh = w if is_rotated else d
        cat = r.get('category', 'WALL_RACK')
        face_color, edge_color = category_colors.get(cat, ('#334155', '#94a3b8'))

        rack_patch = patches.Rectangle((px, py), rw, rh, facecolor=face_color, edgecolor=edge_color, linewidth=1.2)
        ax.add_patch(rack_patch)

        # Draw center shelf line
        if is_rotated:
            ax.plot([px + rw/2, px + rw/2], [py, py + rh], color='#ffffff', linestyle='--', linewidth=0.5, alpha=0.7)
        else:
            ax.plot([px, px + rw], [py + rh/2, py + rh/2], color='#ffffff', linestyle='--', linewidth=0.5, alpha=0.7)

        # Label
        lbl = str(r.get('label', ''))
        if not lbl or len(lbl) > 12:
            lbl = f"{int(w)}mm"
        if cat == 'CHECKOUT_COUNTER':
            lbl = "CASHIER"
        elif cat == 'END_RACK':
            lbl = "END CAP"

        if rw > 200 and rh > 150:
            ax.text(px + rw/2, py + rh/2, lbl, color='#ffffff', fontsize=5.5, fontweight='bold', ha='center', va='center')

    # Dimension lines
    # Length line (top)
    dim_y = -450
    ax.annotate('', xy=(0, dim_y), xytext=(length_mm, dim_y),
                arrowprops=dict(arrowstyle='<->', color='#94a3b8', lw=1.2))
    ax.text(length_mm / 2, dim_y - 120, f"Shop Length: {int(length_mm)} mm ({round(length_mm / 304.8, 1)} ft)",
            color='#1e293b', fontsize=8, fontweight='bold', ha='center', va='bottom')

    # Breadth line (left)
    dim_x = -450
    ax.annotate('', xy=(dim_x, 0), xytext=(dim_x, breadth_mm),
                arrowprops=dict(arrowstyle='<->', color='#94a3b8', lw=1.2))
    ax.text(dim_x - 120, breadth_mm / 2, f"Breadth: {int(breadth_mm)} mm ({round(breadth_mm / 304.8, 1)} ft)",
            color='#1e293b', fontsize=8, fontweight='bold', ha='center', va='center', rotation=90)

    # North Indicator
    ax.annotate('N', xy=(length_mm + 400, 300), xytext=(length_mm + 400, 600),
                arrowprops=dict(facecolor='#ef4444', edgecolor='#b91c1c', width=2, headwidth=6),
                color='#b91c1c', fontsize=9, fontweight='bold', ha='center', va='bottom')

    ax.axis('off')
    plt.tight_layout(pad=0.2)
    plt.savefig(temp_image_path, format='png', dpi=220, bbox_inches='tight')
    plt.close(fig)


def format_inr(val):
    try:
        val = int(round(float(val)))
        s = str(abs(val))
        if len(s) <= 3:
            res = s
        else:
            last3 = s[-3:]
            remaining = s[:-3]
            chunks = []
            while remaining:
                chunks.insert(0, remaining[-2:])
                remaining = remaining[:-2]
            res = ','.join(chunks) + ',' + last3
        return ('-₹ ' if val < 0 else '₹ ') + res
    except:
        return f"₹ {val}"


def generate_quotation_pdf(data, output_pdf_path):
    project_code = data.get('projectCode', 'JK-PROJECT')
    version_num = data.get('versionNumber', 1)
    date_str = data.get('dateStr', '13 September 2026')
    customer = data.get('customer', {})
    shop = data.get('shop', {})
    estimate = data.get('estimate', {})
    version = data.get('version', {})
    racks = data.get('racks', [])

    length_mm = float(shop.get('lengthMm', 6000))
    breadth_mm = float(shop.get('breadthMm', 4500))
    length_ft = round(length_mm / 304.8, 1)
    breadth_ft = round(breadth_mm / 304.8, 1)
    carpet_sqft = round((length_mm / 304.8) * (breadth_mm / 304.8), 1)
    carpet_sqm = round((length_mm * breadth_mm) / 1000000.0, 1)

    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=15 * mm,
        bottomMargin=18 * mm
    )

    styles = getSampleStyleSheet()

    # Custom styles
    brand_dark = colors.HexColor('#0f2942')
    brand_blue = colors.HexColor('#1e40af')
    accent_green = colors.HexColor('#047857')
    text_dark = colors.HexColor('#1e293b')
    border_gray = colors.HexColor('#cbd5e1')

    company_title_style = ParagraphStyle(
        'CompanyTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=brand_dark,
    )

    company_subtitle_style = ParagraphStyle(
        'CompanySubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#475569'),
    )

    section_heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=brand_dark,
        spaceBefore=8,
        spaceAfter=4,
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=text_dark,
    )

    body_regular = ParagraphStyle(
        'BodyRegular',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=text_dark,
    )

    caption_style = ParagraphStyle(
        'CaptionStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#64748b'),
        alignment=1, # Center
    )

    disclaimer_style = ParagraphStyle(
        'DisclaimerStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#64748b'),
    )

    story = []

    # -------------------------------------------------------------
    # 1. OFFICIAL LETTERHEAD
    # -------------------------------------------------------------
    letterhead_left = [
        Paragraph("JK ENGINEERS WORKS", company_title_style),
        Paragraph("Heavy-Duty Retail Display Racks, Storage Mezzanines & Industrial Slotted Angles", company_subtitle_style),
        Paragraph("Unit 12, Industrial Estate, Kanjurmarg West, Mumbai, Maharashtra 400078", company_subtitle_style),
        Paragraph("Tel: +91 7942546295 | Email: sales@jkengineers.co.in | Web: www.jkengineers.co.in", company_subtitle_style),
    ]

    letterhead_right = [
        Paragraph("<b>COMMERCIAL ESTIMATE & BOQ</b>", ParagraphStyle('HRight', parent=company_title_style, fontSize=13, alignment=2, textColor=brand_blue)),
        Paragraph(f"<b>Ref:</b> QUO-{project_code}-V{version_num}", ParagraphStyle('RefRight', parent=company_subtitle_style, alignment=2)),
        Paragraph(f"<b>Date:</b> {date_str}", ParagraphStyle('DateRight', parent=company_subtitle_style, alignment=2)),
        Paragraph("<b>GSTIN:</b> 27AAACJ2849P1Z8 (Maharashtra)", ParagraphStyle('GSTRight', parent=company_subtitle_style, alignment=2)),
    ]

    header_table = Table(
        [[letterhead_left, letterhead_right]],
        colWidths=[110 * mm, 72 * mm]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)

    # Dividing bar
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width="100%", thickness=2.5, color=brand_blue, spaceAfter=8))

    # -------------------------------------------------------------
    # 2. CLIENT & PROJECT PARTICULARS (2 Columns)
    # -------------------------------------------------------------
    client_cell = [
        Paragraph("<b>CUSTOMER / CLIENT DETAILS</b>", body_bold),
        Spacer(1, 2),
        Paragraph(f"<b>Client Name:</b> {customer.get('fullName', 'Valued Customer')}", body_regular),
        Paragraph(f"<b>Business / Store:</b> {customer.get('businessName', 'Retail Store')}", body_regular),
        Paragraph(f"<b>Contact:</b> {customer.get('mobile', 'N/A')}", body_regular),
        Paragraph(f"<b>Site Location:</b> {customer.get('shopLocation', 'Mumbai, Maharashtra')}", body_regular),
    ]

    project_cell = [
        Paragraph("<b>STORE SPECIFICATIONS & METRICS</b>", body_bold),
        Spacer(1, 2),
        Paragraph(f"<b>Store Type:</b> {shop.get('storeTypeName', 'Supermarket Retail')}", body_regular),
        Paragraph(f"<b>Carpet Dimensions:</b> {length_ft} ft × {breadth_ft} ft ({int(length_mm)} × {int(breadth_mm)} mm)", body_regular),
        Paragraph(f"<b>Floor Area:</b> {carpet_sqft} sq.ft ({carpet_sqm} m²)", body_regular),
        Paragraph(f"<b>Arranged Fixtures:</b> {len(racks)} Modular Units • {version.get('totalDisplayAreaSqM', 0)} m² Shelf Area", body_regular),
    ]

    particulars_table = Table(
        [[client_cell, project_cell]],
        colWidths=[91 * mm, 91 * mm]
    )
    particulars_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, border_gray),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_gray),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(particulars_table)
    story.append(Spacer(1, 6 * mm))

    # -------------------------------------------------------------
    # 3. 2D FLOOR PLAN GRAPHIC
    # -------------------------------------------------------------
    temp_img = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
    temp_img.close()
    try:
        render_floor_plan_image(data, temp_img.name)
        story.append(Paragraph("<b>2D SHOP FLOOR PLAN & RACK ARRANGEMENT (CAD LAYOUT)</b>", section_heading_style))
        story.append(Image(temp_img.name, width=182 * mm, height=92 * mm))
        story.append(Spacer(1, 1 * mm))
        story.append(Paragraph(
            f"<b>Figure 1:</b> Shop layout showing {len(racks)} arranged fixtures. Wall perimeter units in navy, central double-sided gondolas in teal, end caps in amber, and cashier in green. Aisles strictly maintained for optimal customer flow.",
            caption_style
        ))
    except Exception as e:
        print(f"[FloorPlan Rendering Error]: {e}", file=sys.stderr)
    story.append(Spacer(1, 6 * mm))

    # -------------------------------------------------------------
    # 4. ITEMIZED BILL OF QUANTITIES (BOQ) TABLE
    # -------------------------------------------------------------
    story.append(Paragraph("<b>ITEMIZED BILL OF QUANTITIES (BOQ) & MATERIAL BREAKDOWN</b>", section_heading_style))

    boq_headers = [
        Paragraph("<b>Sr.</b>", ParagraphStyle('TH', parent=body_bold, textColor=colors.white, alignment=1)),
        Paragraph("<b>Item Description / Component Specification</b>", ParagraphStyle('TH2', parent=body_bold, textColor=colors.white)),
        Paragraph("<b>Qty</b>", ParagraphStyle('TH3', parent=body_bold, textColor=colors.white, alignment=2)),
        Paragraph("<b>Unit Rate</b>", ParagraphStyle('TH4', parent=body_bold, textColor=colors.white, alignment=2)),
        Paragraph("<b>Total Amount</b>", ParagraphStyle('TH5', parent=body_bold, textColor=colors.white, alignment=2)),
    ]

    boq_data = [boq_headers]
    items = estimate.get('items', [])
    for idx, item in enumerate(items, 1):
        sr = str(idx)
        desc = item.get('description', 'Standard Rack Fixture')
        qty = f"{item.get('quantity', 1)} {item.get('unit', '')}"
        rate = format_inr(item.get('unitRate', 0))
        total = format_inr(item.get('totalAmount', 0))

        boq_data.append([
            Paragraph(sr, ParagraphStyle('TD1', parent=body_regular, alignment=1)),
            Paragraph(desc, body_regular),
            Paragraph(qty, ParagraphStyle('TD3', parent=body_regular, alignment=2)),
            Paragraph(rate, ParagraphStyle('TD4', parent=body_regular, alignment=2)),
            Paragraph(total, ParagraphStyle('TD5', parent=body_bold, alignment=2)),
        ])

    boq_table = Table(boq_data, colWidths=[10 * mm, 98 * mm, 24 * mm, 24 * mm, 26 * mm])
    boq_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), brand_dark),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 0.5, border_gray),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_gray),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
    ]))
    story.append(boq_table)
    story.append(Spacer(1, 6 * mm))

    # -------------------------------------------------------------
    # 5. COMMERCIAL SUMMARY & TAX TABLE
    # -------------------------------------------------------------
    subtotal = float(estimate.get('subTotal', 0))
    gst_cost = float(estimate.get('totalGstCost', 0))
    grand_total = float(estimate.get('grandTotal', 0))
    min_range = float(estimate.get('minRange', grand_total * 0.96))
    max_range = float(estimate.get('maxRange', grand_total * 1.05))

    summary_rows = [
        [
            Paragraph("Subtotal (Raw Materials, Fabrication & Logistics):", body_bold),
            Paragraph(format_inr(subtotal), ParagraphStyle('SR', parent=body_bold, alignment=2))
        ],
        [
            Paragraph("Goods & Services Tax (GST @ 18%):", body_regular),
            Paragraph(format_inr(gst_cost), ParagraphStyle('SRG', parent=body_regular, alignment=2))
        ],
        [
            Paragraph("<b>NET PAYABLE GRAND TOTAL (INCL. GST):</b>", ParagraphStyle('GTL', parent=body_bold, fontSize=10, textColor=brand_blue)),
            Paragraph(f"<b>{format_inr(grand_total)}</b>", ParagraphStyle('GTR', parent=body_bold, fontSize=11, textColor=brand_blue, alignment=2))
        ],
        [
            Paragraph("Indicative Confidence Range (Tolerance: -4% to +5%):", caption_style),
            Paragraph(f"{format_inr(min_range)} – {format_inr(max_range)}", ParagraphStyle('CRR', parent=caption_style, alignment=2))
        ],
    ]

    summary_table = Table(summary_rows, colWidths=[120 * mm, 62 * mm])
    summary_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, brand_blue),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#eff6ff')),
        ('LINEBELOW', (0, 0), (-1, 1), 0.5, border_gray),
        ('LINEBELOW', (0, 2), (-1, 2), 1, brand_blue),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))

    story.append(KeepTogether([
        Paragraph("<b>COMMERCIAL COST & TAX SUMMARY</b>", section_heading_style),
        summary_table,
        Spacer(1, 6 * mm)
    ]))

    # -------------------------------------------------------------
    # 6. COMMERCIAL TERMS & CONDITIONS
    # -------------------------------------------------------------
    terms = [
        "<b>1. Payment Terms:</b> 50% mobilization advance along with confirmed purchase order; 40% against proforma invoice prior to dispatch; 10% upon installation completion.",
        "<b>2. Delivery Schedule:</b> Dispatch within 10 to 14 working days from receipt of technical drawing sign-off and advance payment.",
        "<b>3. Raw Material Guarantee:</b> 100% prime CRCA sheet steel (IS 513) and structural upright sections (IS 2062) sourced exclusively from Tata Steel and JSW Steel.",
        "<b>4. Surface Finishing:</b> Pure polyester epoxy powder coating (50–60 microns) processed via an automated 7-tank hot degreasing and zinc-phosphating sequence for maximum salt-spray resistance.",
        "<b>5. Site Readiness:</b> Customer must provide clear, level flooring, adequate site lighting, and single-phase electricity prior to installation crew arrival.",
        "<b>6. Price Validity:</b> Quoted rates are based on current steel index and are firm for 15 calendar days from the date of issuance.",
    ]

    terms_flowables = [Paragraph("<b>COMMERCIAL TERMS & CONDITIONS</b>", section_heading_style)]
    for t in terms:
        terms_flowables.append(Paragraph(t, disclaimer_style))
        terms_flowables.append(Spacer(1, 1.5 * mm))

    # -------------------------------------------------------------
    # 7. STATUTORY DISCLAIMER & SIGNATURE BLOCKS
    # -------------------------------------------------------------
    disclaimer_text = (
        "<b>Statutory Engineering Notice:</b> This quotation and CAD layout are prepared based on preliminary "
        "dimensions supplied by the customer. Physical laser measurement verification by an authorized JK Engineers Works "
        "technician is recommended prior to punching and fabrication. Prices include standard Mumbai Metropolitan Region transit."
    )
    terms_flowables.append(Spacer(1, 2 * mm))
    terms_flowables.append(Paragraph(disclaimer_text, disclaimer_style))
    terms_flowables.append(Spacer(1, 8 * mm))

    sign_left = [
        Paragraph("<b>CUSTOMER ACCEPTANCE:</b>", body_bold),
        Spacer(1, 12 * mm),
        Paragraph("___________________________________", body_regular),
        Paragraph("Authorized Signature & Business Stamp", body_regular),
        Paragraph(f"Date: ________________________", body_regular),
    ]

    sign_right = [
        Paragraph("<b>FOR JK ENGINEERS WORKS:</b>", body_bold),
        Spacer(1, 12 * mm),
        Paragraph("___________________________________", body_regular),
        Paragraph("Authorized Commercial Signatory (Mumbai)", body_regular),
        Paragraph("Quality Assurance & Project Engineering", body_regular),
    ]

    signature_table = Table([[sign_left, sign_right]], colWidths=[91 * mm, 91 * mm])
    signature_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    terms_flowables.append(signature_table)

    story.append(KeepTogether(terms_flowables))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)

    # Clean up temp image
    if os.path.exists(temp_img.name):
        try:
            os.remove(temp_img.name)
        except:
            pass


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python generate_quotation_pdf.py <input_json_path> <output_pdf_path>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    with open(input_path, 'r', encoding='utf-8') as f:
        payload = json.load(f)

    generate_quotation_pdf(payload, output_path)
    print(f"Quotation PDF successfully generated: {output_path}")
