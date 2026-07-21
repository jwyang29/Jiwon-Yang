#!/usr/bin/env python3
"""
CV PDF generator — jwyang29.github.io/Jiwon-Yang
=================================================
내용을 수정하려면 아래 story 부분의 텍스트를 고친 뒤 다시 실행:

    pip install reportlab          # 최초 1회 (또는 venv 사용)
    python3 scripts/make_cv.py    # 레포 루트에서 실행

출력: public/projects/cv.pdf  →  npm run deploy 로 배포
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph,
                                Spacer, Table, TableStyle, HRFlowable)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# 한글: Noto Sans KR (scripts/fonts/NotoSansKR.ttf)
_FONT = os.path.join(os.path.dirname(__file__), 'fonts', 'NotoSansKR.ttf')
pdfmetrics.registerFont(TTFont('NotoSansKR', _FONT))

INK   = HexColor('#111111')
PAPER = HexColor('#f7f6f2')
PINK  = HexColor('#ff8fa6')
TEAL  = HexColor('#2ab5ab')
GRAY  = HexColor('#555555')

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'projects', 'cv.pdf')


def bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    canvas.setFillColor(TEAL)
    canvas.setFont('Courier-Bold', 7)
    canvas.drawString(18 * mm, 10 * mm, '*' * 92)
    canvas.setFillColor(GRAY)
    canvas.setFont('Courier', 7)
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f'JIWON YANG — CV · PAGE {doc.page}')
    canvas.restoreState()


doc = BaseDocTemplate(OUT, pagesize=A4,
    leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=18 * mm)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')
doc.addPageTemplates([PageTemplate(id='p', frames=[frame], onPage=bg)])

S = dict(
  name=ParagraphStyle('name', fontName='Helvetica-Bold', fontSize=25, leading=29, textColor=INK),
  sub=ParagraphStyle('sub', fontName='Courier-Bold', fontSize=9, leading=13, textColor=INK, spaceBefore=3),
  contact=ParagraphStyle('contact', fontName='Helvetica', fontSize=8.5, leading=12, textColor=GRAY, spaceBefore=4),
  section=ParagraphStyle('section', fontName='Courier-Bold', fontSize=10.5, leading=14, textColor=INK, spaceBefore=13, spaceAfter=2),
  item=ParagraphStyle('item', fontName='Helvetica-Bold', fontSize=9.8, leading=13.5, textColor=INK, spaceBefore=6),
  body=ParagraphStyle('body', fontName='Helvetica', fontSize=9.2, leading=13.2, textColor=INK, spaceBefore=2),
  bullet=ParagraphStyle('bullet', fontName='Helvetica', fontSize=9.2, leading=13.2, textColor=INK,
                        leftIndent=10, bulletIndent=1, spaceBefore=2),
  small=ParagraphStyle('small', fontName='Helvetica', fontSize=8.6, leading=12.4, textColor=INK,
                       leftIndent=10, spaceBefore=3),
)


def sec(title):
    return [Paragraph(f'<font color="#ff8fa6">***</font>&nbsp; {title}', S['section']),
            HRFlowable(width='100%', thickness=0.9, color=TEAL, spaceBefore=1, spaceAfter=3)]


def B(text):
    return Paragraph(text, S['bullet'], bulletText='●')


story = []

# ══ Header ════════════════════════════════════════════════════════════════════
story.append(Paragraph('JIWON YANG&nbsp;&nbsp;<font name="NotoSansKR" size="15">양지원</font>', S['name']))
story.append(Paragraph('DESIGN UNDERGRADUATE · AFFECTIVE &amp; MULTISENSORY INTERACTION · HCI', S['sub']))
story.append(Paragraph(
  'jwyang29@snu.ac.kr &nbsp;·&nbsp; '
  'Portfolio: <link href="https://jwyang29.github.io/Jiwon-Yang/" color="#2ab5ab">jwyang29.github.io/Jiwon-Yang</link> &nbsp;·&nbsp; '
  'GitHub: <link href="https://github.com/jwyang29" color="#2ab5ab">github.com/jwyang29</link>', S['contact']))
story.append(Spacer(1, 2))

# ══ Research Interests ════════════════════════════════════════════════════════
story += sec('RESEARCH INTERESTS')
story.append(Paragraph(
  'Designer-researcher working at the intersection of <b>affective computing</b>, <b>multisensory '
  'interaction</b>, and <b>HCI</b>. My work translates non-verbal sensory experience (particularly sound '
  'and touch) into personalized cross-modal representations, using both interactive machine learning '
  'and physical computing. I am drawn to designing natural, human interfaces that bridge subjective '
  'perception and computational systems, with a focus on accessibility and creative expression.', S['body']))

# ══ Education ═════════════════════════════════════════════════════════════════
story += sec('EDUCATION')
story.append(Paragraph('Seoul National University — B.F.A. in Design &nbsp;<font name="Helvetica" size="8.6" color="#555555">· 2022–2027 (expected)</font>', S['item']))
story.append(B('Major GPA: 4.0 / 4.3'))
story.append(B('<b>HCI &amp; Interaction:</b> Human Behavior and Design (A+), Object Interaction Design (A+), '
               'Product Service Design (A+), UI Design Programming (A0), Media Design Programming (A0)'))
story.append(B('<b>AI &amp; Engineering:</b> Design for Machine Learning (A+), Extended Reality Design (A+), '
               'Data Visualization (S), Introduction to AI (S)'))
story.append(Paragraph('University of Sydney — Exchange Student, Interaction Design &nbsp;<font name="Helvetica" size="8.6" color="#555555">· 2024 (Sem. 2)</font>', S['item']))

# ══ Research Experience ═══════════════════════════════════════════════════════
story += sec('RESEARCH EXPERIENCE')
story.append(Paragraph('Independent Research — Researcher (First Author) &nbsp;<font name="Helvetica" size="8.6" color="#555555">· Dec 2025–Present</font>', S['item']))
story.append(Paragraph('<i>"Beyond Parentheses: Personalizing Graphical Sound Captions through Interactive Machine Learning"</i>', S['body']))
story.append(B('Led the entire project end-to-end: problem framing, system design, implementation, user study, and manuscript writing.'))
story.append(B('Built the <b>IML Audio Workstation</b> — a dual-head (multi-task) neural network mapping '
               'psychoacoustic features to personalized 2D motion graphics, rendered in WebGL / Three.js.'))
story.append(B('Designed a <b>"Listen–Sculpt–Train"</b> human-in-the-loop workflow for accessible, personalized sound '
               'captioning (incl. Deaf and hard-of-hearing viewers); pilot study (n=4) raised perceptual agreement '
               'from 3.2 to 6.4 on a 7-point scale.'))
story.append(Paragraph('Medical AI Lab (IMSI), Seoul National University — Undergraduate Research Intern &nbsp;<font name="Helvetica" size="8.6" color="#555555">· Feb 2026–Present</font>', S['item']))
story.append(B('Implemented and experimented with medical-imaging models and tasks in PyTorch.'))
story.append(B('Led data visualization and paper-figure design for medical imaging research — bridging design and ML.'))

# ══ Selected Projects ═════════════════════════════════════════════════════════
story += sec('SELECTED PROJECTS')
story.append(Paragraph('Playground: A Line Between Us — Individual &nbsp;<font name="Helvetica" size="8.6" color="#555555">· 2026</font>', S['item']))
story.append(B('Interactive installation that reads a visitor\'s touch gesture through a sparse sensor grid and '
               '"answers" by drawing back in sand — translating the feel of a gesture (pressure, pace) rather than '
               'copying it. · Tools: physical computing (sensor grid), actuated drawing machine. · '
               '<b>SIGGRAPH Asia 2026 Art Gallery (under review)</b>'))
story.append(Paragraph('Chorus — Team &nbsp;<font name="Helvetica" size="8.6" color="#555555">· 2025</font>', S['item']))
story.append(B('Medieval-organ-inspired interactive artwork: light sensors detect a visitor\'s playing gestures to '
               'control four "door" structures — modulating emitted light and four-track audio levels so the visitor '
               'conducts an orchestral harmony in real time.'))
story.append(B('Role: overall system design and code implementation (teammate: modeling, fabrication &amp; '
               'installation). · Tools: light sensors, sound/lighting control.'))
story.append(Paragraph('SendLove — Individual &nbsp;<font name="Helvetica" size="8.6" color="#555555">· 2025</font>', S['item']))
story.append(B('Interactive sculpture: layered acrylic panels form the waveform of a recorded voice saying '
               '"<font name="NotoSansKR">사랑해</font>" (I love you); an ultrasonic sensor detects a "sending" '
               'hand gesture, lighting per-panel LED strips in sequence to evoke a message being sent. · '
               'Tools: ultrasonic sensor, LED strips, sound visualization.'))

# ══ Preprints & Manuscripts ═══════════════════════════════════════════════════
story += sec('PREPRINTS &amp; MANUSCRIPTS')
pubs = [
 ('Kyeonghun Kim, Hyeonseok Jung, Youngung Han, et al., <b>Jiwon Yang</b>, et al. "NEMESIS: Noise-Suppressed '
  'Efficient MAE with Enhanced Superpatch Integration Strategy." Submitted to IEEE AICAS 2026 (under review).',
  'Contribution: Data visualization and figure design.'),
 ('Anna Jung, Kyeonghun Kim, Youngung Han, Eunseob Choi, <b>Jiwon Yang</b>, Ken Ying-Kai Liao, Hyuk-Jae Lee, '
  'Nam-Joon Kim. "ProsMAE: Multi-Source MAE Pretraining for ISUP Grade Classification." Submitted to IEEE '
  'APCCAS 2026 (under review).', 'Contribution: Data visualization and figure design.'),
 ('Kyeonghun Kim, Jaehyung Park, Youngung Han, Anna Jung, Seongbin Park, Sumin Lee, <b>Jiwon Yang</b>, et al. '
  '"MATHENA: Mamba-based Architectural Tooth Hierarchical Estimator and Holistic Evaluation Network for Anatomy." '
  'arXiv preprint arXiv:2604.00537, 2026. <link href="https://arxiv.org/abs/2604.00537" color="#2ab5ab">arxiv.org/abs/2604.00537</link>',
  'Contribution: Research design support, manuscript writing, and figure design.'),
 ('Insung Hwang, Kyeonghun Kim, Youngung Han, et al., <b>Jiwon Yang</b>, et al. "LeafFireNet: Hyperspectral Leaf '
  'Dryness Classification for Wildfire Risk Prediction Using Temporal SWIR Spectral Signatures." Submitted to '
  'IEIE Summer Conference 2026 (under review).', 'Contribution: Research assistance.'),
]
for cite, contrib in pubs:
    story.append(B(cite))
    story.append(Paragraph(f'<font color="#555555"><i>{contrib}</i></font>', S['small']))

# ══ Exhibitions ═══════════════════════════════════════════════════════════════
story += sec('EXHIBITIONS (JURIED)')
story.append(B('<b>Playground: A Line Between Us.</b> Submitted to SIGGRAPH Asia 2026 Art Gallery (under review). '
               'Individual work: concept, interaction design, and system implementation.'))

# ══ Skills ════════════════════════════════════════════════════════════════════
story += sec('SKILLS')
skills = [
  ('DESIGN (2D)', 'Photoshop, Illustrator, After Effects, Figma'),
  ('DESIGN (3D)', 'Rhino, Blender, Fusion 360'),
  ('ML / AI', 'PyTorch (model training), Generative AI (Diffusion Models)'),
  ('COMPUTER VISION', 'OpenCV'),
  ('PHYSICAL COMPUTING', 'Arduino, sensors, actuator control'),
  ('XR / GRAPHICS', 'Unity-based XR, WebGL / Three.js'),
  ('WEB', 'HTML, CSS, JavaScript'),
  ('DATA VIZ', 'matplotlib, Tableau'),
]
rows = [[Paragraph(f'<font name="Courier-Bold" size="7.8">{k}</font>', S['body']),
         Paragraph(v, S['body'])] for k, v in skills]
t = Table(rows, colWidths=[42 * mm, None])
t.setStyle(TableStyle([
  ('VALIGN', (0, 0), (-1, -1), 'TOP'),
  ('TOPPADDING', (0, 0), (-1, -1), 1.5),
  ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
  ('LEFTPADDING', (0, 0), (-1, -1), 0),
]))
story.append(t)

# ══ Leadership & Activities ═══════════════════════════════════════════════════
story += sec('LEADERSHIP &amp; ACTIVITIES')
story.append(B('XREAL (XR Society), SNU — Design Lead · 2025 Summer–2026 Summer'))
story.append(B('SNU Design Alliance — Member · 2025'))
story.append(B('ISEA 2025 — Student Volunteer · 2025'))
story.append(B('Gwangju Design Biennale Challenge · 2025'))

# ══ Certifications & Languages ════════════════════════════════════════════════
story += sec('CERTIFICATIONS &amp; LANGUAGES')
story.append(B('NVIDIA DLI — Generative AI with Diffusion Models · 2025'))
story.append(B('IELTS — Overall 7.5 · 2024'))

doc.build(story)
print(f'생성 완료: {os.path.abspath(OUT)}')
