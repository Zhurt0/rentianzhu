#!/usr/bin/env python3
"""Build the Chinese pages in zh/ from the English pages.

Run from the repository root after editing an English page:

    python3 tools/build_zh.py

Each English page is copied, its asset paths are pointed one level up, the
Google Fonts and cdnjs links are swapped for self-hosted copies (so the pages
do not depend on services that can be slow or blocked in mainland China), and
the text is replaced using the tables below. A replacement that no longer
matches the English source stops the build, which is the cue to update the
Chinese text here.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://zhurt0.github.io/rentianzhu/"
PAGES = ["index.html", "about.html", "teaching.html", "links.html"]

META = {
    "index.html": ("朱任天 Rentian Zhu | 哥本哈根商学院经济学博士研究生",
                   "朱任天（Rentian Zhu），哥本哈根商学院经济学博士研究生，哥本哈根大学 Pioneer Centre for AI 附属研究员。研究领域为人工智能、劳动经济学与创新，使用丹麦登记数据和大语言模型。"),
    "about.html": ("关于我 | 朱任天",
                   "朱任天的个人简历、教育背景、家乡，以及在牛津大学、法兰西公学院和芝加哥大学的学术访问经历。"),
    "teaching.html": ("教学 | 朱任天",
                      "朱任天在哥本哈根商学院和香港中文大学（深圳）担任助教的课程，包括计量经济学与微观经济学。"),
    "links.html": ("实用链接 | 朱任天",
                   "朱任天整理的实用链接：Beautiful Danish Data（基于丹麦登记数据的经济学论文指南）与常用 Stata 命令。"),
}

PAPER = "<em>The Role of Employment and Employers in Mental Health</em>"

# (English fragment, Chinese fragment). Applied to every page that contains it.
COMMON = [
    ("<span>Department of Economics</span>", "<span>经济学系</span>"),
    ("<h1>Rentian Zhu</h1>", "<h1>朱任天</h1>"),
    ("<p>PhD Student in Economics (2024&ndash;2028)</p>", "<p>经济学博士研究生（2024&ndash;2028）</p>"),
    ("<p>Copenhagen Business School</p>", "<p>哥本哈根商学院</p>"),
    ('<p class="header-affiliation">Affiliated Researcher, <a href="https://www.aicentre.dk/" target="_blank">Pioneer Centre for AI</a>, University of Copenhagen</p>',
     '<p class="header-affiliation">哥本哈根大学 <a href="https://www.aicentre.dk/" target="_blank">Pioneer Centre for AI</a> 附属研究员</p>'),
    (">Home</a>", ">首页</a>"),
    (">Research</a>", ">研究</a>"),
    (">Teaching</a>", ">教学</a>"),
    (">Links</a>", ">链接</a>"),
    (">About Me</a>", ">关于我</a>"),
    ("<p>&copy; 2026 Rentian Zhu. All rights reserved.</p>", "<p>&copy; 2026 朱任天 版权所有</p>"),
]

PER_PAGE = {
    "index.html": [
        ('alt="Rentian Zhu" class="profile-img"', 'alt="朱任天" class="profile-img"'),
        ('<h2 class="profile-name">Rentian Zhu <span class="nowrap">(<span lang="zh" class="zh-name">朱任天</span>)</span></h2>',
         '<h2 class="profile-name">朱任天 <span class="nowrap profile-latin">Rentian Zhu</span></h2>'),
        ('<p class="profile-title">PhD Student in Economics <span class="nowrap">(2024&ndash;2028)</span></p>',
         '<p class="profile-title">经济学博士研究生<span class="nowrap">（2024&ndash;2028）</span></p>'),
        ('<p class="profile-institution">Copenhagen Business School</p>', '<p class="profile-institution">哥本哈根商学院</p>'),
        ('Affiliated Researcher, <a href="https://www.aicentre.dk/" target="_blank">Pioneer Centre for AI</a><br>University of Copenhagen</p>',
         '哥本哈根大学 <a href="https://www.aicentre.dk/" target="_blank">Pioneer Centre for AI</a><br>附属研究员</p>'),
        ('<i class="fas fa-download"></i> CV', '<i class="fas fa-download"></i> 简历'),
        ('<h2 class="biography-title">Biography</h2>', '<h2 class="biography-title">个人简介</h2>'),
        ('Hello! I am a PhD Student (2024&ndash;2028) in Economics at <a href="https://www.cbs.dk/en/research/departments-and-centres/department-of-economics" target="_blank">Copenhagen Business School</a>. After the PhD I will be a Postdoctoral Researcher at the <a href="https://www.economics.ku.dk/" target="_blank">Department of Economics, University of Copenhagen</a> (expected).',
         '你好！我是<a href="https://www.cbs.dk/en/research/departments-and-centres/department-of-economics" target="_blank">哥本哈根商学院</a>经济学博士研究生（2024&ndash;2028）。博士毕业后，我将在<a href="https://www.economics.ku.dk/" target="_blank">哥本哈根大学经济学系</a>从事博士后研究（预计）。'),
        ('My research sits at the intersection of <strong>AI</strong>, <strong>labor</strong>, and <strong>innovation</strong>. I ask how people live and how they can live better: how work shapes wellbeing, and how technological change&mdash;from patents to large language models&mdash;reshapes the opportunities workers have. I answer these questions by combining Danish register microdata with survey, experimental and unstructured data, such as job postings and patent applications, and by using large language models as measurement tools.',
         '我的研究处于<strong>人工智能</strong>、<strong>劳动经济学</strong>与<strong>创新</strong>的交叉领域。我关心人们如何生活，以及如何生活得更好：工作如何影响人的幸福感，技术变革（从专利到大语言模型）又如何重塑劳动者的机会。为回答这些问题，我将丹麦登记微观数据与调查数据、实验数据，以及招聘广告、专利申请等非结构化数据结合起来，并把大语言模型用作测量工具。'),
        ('<p class="biography-text">Email: ', '<p class="biography-text">邮箱：'),
        ('<h3 class="updates-title">Updates</h3>', '<h3 class="updates-title">近况</h3>'),
        ('<span class="updates-stamp">Last updated November 2</span>', '<span class="updates-stamp">最近更新：11月2日</span>'),
        ('<span class="update-date">Oct 2026</span>', '<span class="update-date">2026年10月</span>'),
        ('<span class="update-date">Aug 2026</span>', '<span class="update-date">2026年8月</span>'),
        ('<span class="update-date">May 2026</span>', '<span class="update-date">2026年5月</span>'),
        ('<span class="update-date">Apr 2026</span>', '<span class="update-date">2026年4月</span>'),
        ('After my PhD, I will join the <a href="https://www.economics.ku.dk/" target="_blank">Department of Economics at the University of Copenhagen</a> as a Postdoctoral Researcher for one year (expected 2028&ndash;2029).',
         '博士毕业后，我将加入<a href="https://www.economics.ku.dk/" target="_blank">哥本哈根大学经济学系</a>，担任为期一年的博士后研究员（预计 2028&ndash;2029 年）。'),
        ('I have joined the <a href="https://www.aicentre.dk/" target="_blank">Pioneer Centre for AI</a> at the University of Copenhagen as an Affiliated Researcher.',
         '我已加入哥本哈根大学 <a href="https://www.aicentre.dk/" target="_blank">Pioneer Centre for AI</a>，担任附属研究员。'),
        (f'I presented our paper {PAPER} at EEA 2026 in Dublin.',
         f'我在都柏林举行的 EEA 2026 年会上报告了论文 {PAPER}。'),
        ('I attended the <a href="https://econincubator.uchicago.edu/events/ai-in-the-workplace-conference/" target="_blank">AI in the Workplace Conference</a> at UChicago, May 27&ndash;30.',
         '5月27&ndash;30日，我参加了芝加哥大学的 <a href="https://econincubator.uchicago.edu/events/ai-in-the-workplace-conference/" target="_blank">AI in the Workplace Conference</a>。'),
        (f'I presented our paper {PAPER} at SOLE 2026 in Denver, May 1&ndash;2.',
         f'5月1&ndash;2日，我在丹佛举行的 SOLE 2026 年会上报告了论文 {PAPER}。'),
        ('I visited the <a href="https://www.college-de-france.fr/en" target="_blank">Coll&egrave;ge de France</a> from April 6, hosted by <a href="https://www.philippeaghion.com/" target="_blank">Philippe Aghion</a> and Antonin Bergeaud.',
         '自4月6日起，我访问了<a href="https://www.college-de-france.fr/en" target="_blank">法兰西公学院（Coll&egrave;ge de France）</a>，由 <a href="https://www.philippeaghion.com/" target="_blank">Philippe Aghion</a> 和 Antonin Bergeaud 接待。'),
        ('Show all updates <i class="fas fa-chevron-down"></i>', '显示全部近况 <i class="fas fa-chevron-down"></i>'),
        ('Show fewer updates <i class="fas fa-chevron-up"></i>', '收起 <i class="fas fa-chevron-up"></i>'),
        ('<h2 class="section-title">Research</h2>', '<h2 class="section-title">研究</h2>'),
        ('<h3>Work in Progress</h3>', '<h3>进行中的研究</h3>'),
        ('<h3>Working Papers</h3>', '<h3>工作论文</h3>'),
        ('<h3>Research Stay and Visits</h3>', '<h3>学术访问</h3>'),
        ('<p>Presented at DGPE 2025. Presented by coauthors at CEU, ECB and CBS.</p>',
         '<p>本人报告于 DGPE 2025；合作者报告于中欧大学（CEU）、欧洲中央银行（ECB）和哥本哈根商学院（CBS）。</p>'),
        ('<p>Presented at EEA 2026, SOLE 2026, DGPE 2026 and the Applied Micro Group Seminar at the University of Oxford. Presented by coauthors at Princeton, NUS, CUHK, NHH and the Econometric Society.</p>',
         '<p>本人报告于 EEA 2026、SOLE 2026、DGPE 2026 以及牛津大学应用微观经济学研讨会（Applied Micro Group Seminar）；合作者报告于普林斯顿大学、新加坡国立大学（NUS）、香港中文大学（CUHK）、挪威经济学院（NHH）以及计量经济学会（Econometric Society）会议。</p>'),
        ('<i class="fas fa-file-alt"></i> Working paper</a>', '<i class="fas fa-file-alt"></i> 工作论文</a>'),
        ('<p>Media coverage: ', '<p>媒体报道：'),
        ('Mandag Morgen</a>, &ldquo;', 'Mandag Morgen</a>，&ldquo;'),
        ('&rdquo; (November 2026)</p>', '&rdquo;（2026年11月）</p>'),
        ('<p>Presented at the workshop <a href="https://masshine-llm-workshop.automate.business.aau.dk/" target="_blank">Applying LLMs and GenAI in Innovation Economics</a>, Aalborg University Business School, December 2025.</p>',
         '<p>报告于奥尔堡大学商学院研讨会 <a href="https://masshine-llm-workshop.automate.business.aau.dk/" target="_blank">Applying LLMs and GenAI in Innovation Economics</a>（2025年12月）。</p>'),
        ('<i class="fas fa-file-pdf"></i> Online appendix</a>', '<i class="fas fa-file-pdf"></i> 在线附录</a>'),
        ('<i class="fas fa-play-circle"></i> Video explainer (4 min)</summary>', '<i class="fas fa-play-circle"></i> 视频讲解（4 分钟，英文）</summary>'),
        ('Your browser cannot play this video. ', '您的浏览器无法播放此视频。'),
        ('>Download the explainer (MP4)</a>.', '>下载视频（MP4）</a>。'),
        ('<h4>University of Chicago, May 2026</h4>', '<h4>芝加哥大学，2026年5月</h4>'),
        ('<h4>Coll&egrave;ge de France and Banque de France, April 2026</h4>', '<h4>法兰西公学院与法兰西银行，2026年4月</h4>'),
        ('<h4>University of Oxford, March 2026</h4>', '<h4>牛津大学，2026年3月</h4>'),
        ('<h4>University of Oxford, Trinity Term 2025</h4>', '<h4>牛津大学，2025年三一学期</h4>'),
    ],
    "about.html": [
        ('<h2 class="section-title">About Me</h2>', '<h2 class="section-title">关于我</h2>'),
        ('<i class="fas fa-download"></i> Curriculum Vitae (PDF)</a>', '<i class="fas fa-download"></i> 个人简历（PDF，英文）</a>'),
        ('<span class="sc">Figure 1.</span> Revealed location choices of the author', '<span class="sc">图 1.</span> 作者的“显示性”居住地选择'),
        ('<span class="sc">Table 1.</span> Summary statistics (N = 1)', '<span class="sc">表 1.</span> 描述性统计（N = 1）'),
        ('<th>Variable</th><th>Value</th>', '<th>变量</th><th>取值</th>'),
        ('<td>PhD Student, CBS (2024&ndash;2028)</td>', '<td>哥本哈根商学院博士研究生（2024&ndash;2028）</td>'),
        ('<td>Advanced Economics and Finance, CBS, 2024</td>', '<td>高级经济学与金融学，哥本哈根商学院，2024</td>'),
        ('<td>Business Administration, CUHK-Shenzhen, 2022</td>', '<td>工商管理，香港中文大学（深圳），2022</td>'),
        ('<td>Quzhou, Zhejiang</td>', '<td>浙江衢州</td>'),
        ('<td>Mandarin, English</td>', '<td>普通话、英语</td>'),
        ('<p class="fig-notes">Source: author\'s <a href="images/CV_Rentian_Zhu_2025_01.pdf" target="_blank">CV</a>. Standard errors not reported.</p>',
         '<p class="fig-notes">数据来源：作者<a href="images/CV_Rentian_Zhu_2025_01.pdf" target="_blank">简历</a>。未报告标准误。</p>'),
        ('>Quzhou</text>', '>衢州</text>'),
        ('>Shenzhen</text>', '>深圳</text>'),
        ('>Copenhagen</text>', '>哥本哈根</text>'),
        ('>Vancouver</text>', '>温哥华</text>'),
        ('>Oxford</text>', '>牛津</text>'),
        ('>Oxford, Paris</text>', '>牛津、巴黎</text>'),
        ('>Chicago</text>', '>芝加哥</text>'),
        ('>longitude</text>', '>经度</text>'),
        ('>year →</text>', '>年份 →</text>'),
        ('<h2 class="section-title">On my name</h2>', '<h2 class="section-title">名字的由来</h2>'),
    ],
    "teaching.html": [
        ('<h2 class="section-title">Teaching</h2>', '<h2 class="section-title">教学</h2>'),
        ('<h3>Copenhagen Business School</h3>', '<h3>哥本哈根商学院</h3>'),
        ('<h3>The Chinese University of Hong Kong, Shenzhen</h3>', '<h3>香港中文大学（深圳）</h3>'),
        ('<h4>Econometrics (&Oslash;konometri)</h4>', '<h4>计量经济学（&Oslash;konometri）</h4>'),
        ('<h4>Microeconomics</h4>', '<h4>微观经济学</h4>'),
        ('<p>Term: Fall &middot; Offered: 2024</p>', '<p>学期：秋季 &middot; 年份：2024</p>'),
        ('<p>Term: Summer &middot; Offered: 2021</p>', '<p>学期：夏季 &middot; 年份：2021</p>'),
        ('<p>Term: Fall &middot; Offered: 2019</p>', '<p>学期：秋季 &middot; 年份：2019</p>'),
        ('<p>Teaching Assistant &middot; Lectures and tutorials in English</p>', '<p>助教 &middot; 英文授课与辅导课</p>'),
        ('<p>Undergraduate Teaching Assistant</p>', '<p>本科生助教</p>'),
        ('<p>Teaching Assistant</p>', '<p>助教</p>'),
    ],
    "links.html": [
        ('<h2 class="section-title">Useful Links</h2>', '<h2 class="section-title">实用链接</h2>'),
        ('<h3>Data</h3>', '<h3>数据</h3>'),
        ('<p>A field guide to economics published with Danish administrative data: summaries of Top 5, AEJ, <em>Review of Economics and Statistics</em>, <em>Economic Journal</em>, <em>Journal of Labor Economics</em> and <em>Journal of Public Economics</em> papers built on Danish registers, the same papers grouped by theme, and a variable map of the registers at the individual and firm level.</p>',
         '<p>一份面向经济学研究者的丹麦行政登记数据指南：汇总了发表在五大顶刊、AEJ、<em>Review of Economics and Statistics</em>、<em>Economic Journal</em>、<em>Journal of Labor Economics</em> 和 <em>Journal of Public Economics</em> 上、基于丹麦登记数据的论文，并按主题分类，另附个人层面与企业层面登记数据的变量地图（网站为英文）。</p>'),
        ('<h4>Search your do-files for a string</h4>', '<h4>在 do 文件中搜索字符串</h4>'),
        ('<h3>Talks and Slides</h3>', '<h3>报告与幻灯片</h3>'),
        ('<p>This presentation was delivered at the Economics and Innovation of AI Network Workshop, as part of the "Applying LLMs and GenAI in Innovation Economics" Methods Fair.</p>',
         '<p>本报告发表于 Economics and Innovation of AI Network Workshop，属于“Applying LLMs and GenAI in Innovation Economics”方法展示环节（Methods Fair）。</p>'),
        ('<p>This lightning pitch demonstrates three practical applications for Claude Code: (1) automated documentation and exploration of GitHub replication packages, (2) large-scale conference paper scraping and organization, and (3) transformer-based NLP implementations for patent analysis.</p>',
         '<p>这场闪电演讲展示了 Claude Code 的三个实际应用：（1）自动梳理 GitHub 复现包并生成文档；（2）大规模抓取和整理会议论文；（3）用基于 Transformer 的自然语言处理方法分析专利。</p>'),
        ('<p>This presentation was delivered at the Economics and Innovation of AI Workshop.</p>',
         '<p>本报告发表于 Economics and Innovation of AI Workshop。</p>'),
        ('<i class="fas fa-file-pdf"></i> Slides (PDF)</a>', '<i class="fas fa-file-pdf"></i> 幻灯片（PDF，英文）</a>'),
        ('<p>Lists every <code>.do</code> file in the working directory that contains the given string and shows the matching lines.</p>',
         '<p>列出当前工作目录下所有包含指定字符串的 <code>.do</code> 文件，并显示匹配的行。</p>'),
    ],
}

NAME_NOTE_ZH = '''<div class="name-note">
            <p>我的名字“任天”，取自“自任以天下之重”，意思是把天下的重担放在自己肩上。这句话出自《孟子》，说的是伊尹：他原本在有莘之野耕作，后来出来辅佐商汤、拯救百姓。</p>
            <blockquote>思天下之民匹夫匹妇有不被尧舜之泽者，若己推而内之沟中。其自任以天下之重如此。<cite>《孟子&middot;万章上》</cite></blockquote>
            <blockquote>他想到天下的百姓，哪怕只有一个普通男女没有享受到尧舜之道的恩泽，就像是自己把他们推进了沟里。他就是这样把天下的重任担在自己肩上。<cite>白话大意</cite></blockquote>
            <p>孟子在评论几位圣人时又提到了这一点：伯夷是“圣之清者”，柳下惠是“圣之和者”，而伊尹是“圣之任者”，也就是以天下为己任的圣人（《孟子&middot;万章下》）。《论语》里曾子的话说的也是同一个意思：“士不可以不弘毅，任重而道远。”（《论语&middot;泰伯》）</p>
            <p>这是一个需要慢慢长成的名字。我把它当作一种提醒：经济学归根结底，关心的是人们如何生活。</p>
        </div>'''


def must_replace(text, old, new, page):
    if old not in text:
        sys.exit(f"build_zh: text not found in {page} (update the translation table):\n  {old[:140]}")
    return text.replace(old, new)


def build(page):
    s = (ROOT / page).read_text(encoding="utf-8")
    url_en = BASE + ("" if page == "index.html" else page)
    url_zh = BASE + "zh/" + ("" if page == "index.html" else page)
    title, desc = META[page]

    # --- head ---
    s = must_replace(s, '<html lang="en">', '<html lang="zh-Hans">', page)
    s = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", s, count=1, flags=re.S)
    s = re.sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + desc + m.group(2), s, count=1)
    s = re.sub(r'(<meta (?:property="og:description"|name="twitter:description") content=")[^"]*(")', lambda m: m.group(1) + desc + m.group(2), s)
    s = re.sub(r'(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*(")', lambda m: m.group(1) + title + m.group(2), s)
    s = must_replace(s, '<meta property="og:site_name" content="Rentian Zhu">', '<meta property="og:site_name" content="朱任天">', page)
    s = must_replace(s, '<meta property="og:locale" content="en_US">', '<meta property="og:locale" content="zh_CN">', page)
    s = must_replace(s, f'<link rel="canonical" href="{url_en}">', f'<link rel="canonical" href="{url_zh}">', page)
    s = must_replace(s, f'<meta property="og:url" content="{url_en}">', f'<meta property="og:url" content="{url_zh}">', page)
    # self-hosted fonts and icons instead of Google Fonts / cdnjs
    s = re.sub(r'\s*<link rel="preconnect"[^>]*>', "", s)
    s, n = re.subn(r'<link rel="stylesheet" href="https://cdnjs\.cloudflare\.com/ajax/libs/font-awesome/[^"]*">',
                   '<link rel="stylesheet" href="vendor/fontawesome/css/all.min.css">', s)
    assert n == 1, page
    s, n = re.subn(r'<link href="https://fonts\.googleapis\.com/css2\?family=Lora[^"]*" rel="stylesheet">',
                   '<link rel="stylesheet" href="css/fonts-local.css">', s)
    assert n == 1, page
    s = re.sub(r'\s*<link href="https://fonts\.googleapis\.com/css2\?family=Noto\+Serif\+SC[^"]*" rel="stylesheet">', "", s)

    # --- language switch ---
    tail = "" if page == "index.html" else page
    en_switch = f'<div class="lang-switch"><span class="lang-current">EN</span><a href="zh/{tail}" lang="zh-Hans" hreflang="zh-Hans">中文</a></div>'
    zh_switch = f'<div class="lang-switch"><a href="../{tail}" lang="en" hreflang="en">EN</a><span class="lang-current">中文</span></div>'
    s = must_replace(s, en_switch, zh_switch, page)

    # --- body text ---
    for old, new in COMMON:
        if old in s:
            s = s.replace(old, new)
    for old, new in PER_PAGE[page]:
        s = must_replace(s, old, new, page)
    if page == "index.html":
        # coauthor lines: "With A, B and C"
        def coauthors(m):
            line = m.group(0).replace("<p>With ", "<p>合作者：").replace("</a>, <a", "</a>、<a").replace("</a> and <a", "</a>、<a")
            return line
        s = re.sub(r"<p>With <a.*?</p>", coauthors, s)
        # in the visits section the people are hosts and collaborators, not only coauthors
        head, sep, rest = s.partition("<h3>学术访问</h3>")
        assert sep, "visits heading missing"
        s = head + sep + rest.replace("<p>合作者：", "<p>访问交流：")
    if page == "about.html":
        s, n = re.subn(r'<div class="name-note">.*?</div>', lambda m: NAME_NOTE_ZH, s, count=1, flags=re.S)
        assert n == 1, "name note missing"
        s = s.replace("aria-label=\"Timeline of the author's locations by longitude, 2015 to 2028\"", 'aria-label="作者历年所在地的经度，2015 至 2028 年"')

    # --- asset paths: one level up ---
    s = re.sub(r'(?<=["\s])(css|js|images|files|vendor)/', r"../\1/", s)

    out = ROOT / "zh" / page
    out.parent.mkdir(exist_ok=True)
    out.write_text(s, encoding="utf-8")
    return out


if __name__ == "__main__":
    for p in PAGES:
        print("wrote", build(p).relative_to(ROOT))
