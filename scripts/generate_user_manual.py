#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 Markdown 用户手册转换为 Word 文档
"""

from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import re

def set_cell_shading(cell, color):
    """设置单元格背景色"""
    shading_elm = OxmlElement('w:shd')
    shading_elm.set(qn('w:fill'), color)
    cell._tc.get_or_add_tcPr().append(shading_elm)

def create_document():
    doc = Document()
    
    # 设置页面边距
    sections = doc.sections
    for section in sections:
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(3.17)
        section.right_margin = Cm(3.17)
    
    # 创建样式
    styles = doc.styles
    
    # 标题1样式
    style_h1 = styles['Heading 1']
    style_h1.font.name = '黑体'
    style_h1.font.size = Pt(22)
    style_h1.font.bold = True
    style_h1.font.color.rgb = RGBColor(0, 0, 0)
    style_h1.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    style_h1.paragraph_format.space_before = Pt(24)
    style_h1.paragraph_format.space_after = Pt(18)
    
    # 标题2样式
    style_h2 = styles['Heading 2']
    style_h2.font.name = '黑体'
    style_h2.font.size = Pt(16)
    style_h2.font.bold = True
    style_h2.font.color.rgb = RGBColor(0, 0, 0)
    style_h2.paragraph_format.space_before = Pt(18)
    style_h2.paragraph_format.space_after = Pt(12)
    
    # 标题3样式
    style_h3 = styles['Heading 3']
    style_h3.font.name = '黑体'
    style_h3.font.size = Pt(14)
    style_h3.font.bold = True
    style_h3.font.color.rgb = RGBColor(0, 0, 0)
    style_h3.paragraph_format.space_before = Pt(12)
    style_h3.paragraph_format.space_after = Pt(6)
    
    # 正文样式
    style_normal = styles['Normal']
    style_normal.font.name = '宋体'
    style_normal.font.size = Pt(12)
    style_normal.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    style_normal.paragraph_format.first_line_indent = Cm(0.74)
    
    return doc

def add_cover_page(doc):
    """添加封面"""
    # 空行
    for _ in range(3):
        doc.add_paragraph()
    
    # 主标题
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run('韶山市水环境综合整治一张图系统')
    run.font.name = '黑体'
    run.font.size = Pt(26)
    run.font.bold = True
    
    # 副标题
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run('用户手册')
    run.font.name = '黑体'
    run.font.size = Pt(22)
    run.font.bold = True
    
    # 空行
    for _ in range(8):
        doc.add_paragraph()
    
    # 文档信息
    info_items = [
        ('文档编号', 'SS-WEM-UM-001'),
        ('版本', 'V1.0'),
        ('编制单位', '正元地理信息集团股份有限公司'),
        ('编制日期', '2026年5月'),
    ]
    
    for label, value in info_items:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(f'{label}：{value}')
        run.font.name = '宋体'
        run.font.size = Pt(14)
    
    # 分页
    doc.add_page_break()

def add_revision_history(doc):
    """添加修订记录"""
    doc.add_heading('修订记录', level=1)
    
    table = doc.add_table(rows=2, cols=4)
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # 表头
    headers = ['版本号', '修订日期', '修订人', '修订内容']
    header_row = table.rows[0]
    for i, header in enumerate(headers):
        cell = header_row.cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_cell_shading(cell, 'D9E2F3')
    
    # 数据行
    data_row = table.rows[1]
    data = ['V1.0', '2026-05-07', '系统管理员', '初版发布']
    for i, value in enumerate(data):
        cell = data_row.cells[i]
        cell.text = value
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    doc.add_paragraph()
    doc.add_page_break()

def add_toc(doc):
    """添加目录"""
    doc.add_heading('目录', level=1)
    
    toc_items = [
        ('第一章 引言', 0),
        ('1.1 编写目的', 1),
        ('1.2 读者对象', 1),
        ('1.3 术语定义', 1),
        ('第二章 系统功能总体说明', 0),
        ('2.1 系统概述', 1),
        ('2.2 用户角色', 1),
        ('2.3 系统主界面', 1),
        ('2.4 主要业务流程', 1),
        ('第三章 功能介绍', 0),
        ('3.1 综合态势', 1),
        ('3.2 设施管理', 1),
        ('3.3 生态整治', 1),
        ('3.4 遥感监测', 1),
        ('3.5 应急协同', 1),
        ('3.6 系统管理', 1),
    ]
    
    for text, level in toc_items:
        p = doc.add_paragraph()
        if level == 0:
            run = p.add_run(text)
            run.font.bold = True
            run.font.size = Pt(12)
        else:
            p.paragraph_format.left_indent = Cm(0.5)
            run = p.add_run(text)
            run.font.size = Pt(11)
    
    doc.add_page_break()

def add_chapter1(doc):
    """第一章 引言"""
    doc.add_heading('第一章 引言', level=1)
    
    # 1.1 编写目的
    doc.add_heading('1.1 编写目的', level=2)
    
    p = doc.add_paragraph()
    p.add_run('本用户手册旨在为韶山市水环境综合整治一张图系统的使用者提供详细的操作指南。通过本手册，用户能够：')
    
    purposes = [
        '快速了解系统的整体架构和功能模块',
        '掌握各业务模块的操作流程和使用方法',
        '熟悉系统的数据管理和报表功能',
        '提高日常业务工作的效率',
    ]
    for purpose in purposes:
        p = doc.add_paragraph(style='List Number')
        p.add_run(purpose)
    
    p = doc.add_paragraph()
    p.add_run('本手册适用于韶山市高新区水环境管理相关业务人员、系统管理员及技术维护人员参考使用。')
    
    # 1.2 读者对象
    doc.add_heading('1.2 读者对象', level=2)
    p = doc.add_paragraph('本手册的预期读者包括：')
    
    # 读者对象表格
    table = doc.add_table(rows=5, cols=2)
    table.style = 'Table Grid'
    
    headers = ['读者类型', '说明']
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_shading(cell, 'D9E2F3')
    
    readers = [
        ('业务操作人员', '日常使用系统进行水环境设施管理、巡河记录、事件处理等业务操作的工作人员'),
        ('管理人员', '查看统计数据、报表分析、决策支持的部门负责人及管理人员'),
        ('系统管理员', '负责系统配置、数据维护、用户管理的技术人员'),
        ('运维人员', '负责系统日常运行维护的技术支持人员'),
    ]
    
    for i, (reader_type, desc) in enumerate(readers, 1):
        table.rows[i].cells[0].text = reader_type
        table.rows[i].cells[1].text = desc
    
    doc.add_paragraph()
    
    # 1.3 术语定义
    doc.add_heading('1.3 术语定义', level=2)
    
    table = doc.add_table(rows=7, cols=2)
    table.style = 'Table Grid'
    
    headers = ['术语', '定义']
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_shading(cell, 'D9E2F3')
    
    terms = [
        ('一张图', '将水环境相关设施、监测点位、污染源等数据整合到统一地图平台进行可视化展示和管理'),
        ('河湖长制', '由各级党政主要负责人担任"河长""湖长"，负责组织领导相应河湖的管理和保护工作的制度'),
        ('排口', '入河入海排污口的简称，指直接或者通过管道、沟、渠等排污通道向环境水体排放污水的口门'),
        ('断面', '河流监测断面，指在河流上设置的用于水质监测的特定位置'),
        ('遥感监测', '利用遥感技术对水体、岸线、植被等进行远距离监测和分析的技术手段'),
        ('应急预案', '针对可能发生的水环境污染突发事件，预先制定的应急处置方案'),
    ]
    
    for i, (term, definition) in enumerate(terms, 1):
        table.rows[i].cells[0].text = term
        table.rows[i].cells[1].text = definition
    
    doc.add_page_break()

def add_chapter2(doc):
    """第二章 系统功能总体说明"""
    doc.add_heading('第二章 系统功能总体说明', level=1)
    
    # 2.1 系统概述
    doc.add_heading('2.1 系统概述', level=2)
    
    p = doc.add_paragraph()
    p.add_run('韶山市水环境综合整治一张图系统是基于GIS地理信息技术的综合管理平台，集成了水环境设施管理、生态整治项目管理、遥感监测分析、应急协同指挥、报表统计分析等功能模块。系统通过"一张图"的方式，实现对韶山市高新区水环境相关数据的统一管理和可视化展示，为水环境保护和治理提供信息化支撑。')
    
    doc.add_heading('2.1.1 系统目标', level=3)
    
    goals = [
        ('数据整合', '整合泵站、管网、排口、污水厂等设施信息，形成统一的水环境基础数据库'),
        ('可视化展示', '通过地图直观展示各类设施分布、监测点位、水质状况等信息'),
        ('业务协同', '支持河湖长制日常业务、应急事件处置、项目管理等协同工作'),
        ('决策支持', '提供统计分析、报表导出等功能，辅助管理决策'),
    ]
    
    for i, (title, desc) in enumerate(goals, 1):
        p = doc.add_paragraph(style='List Number')
        run = p.add_run(f'{title}：')
        run.font.bold = True
        p.add_run(desc)
    
    doc.add_heading('2.1.2 功能架构', level=3)
    p = doc.add_paragraph()
    p.add_run('系统采用模块化设计，主要包含以下功能模块：')
    
    modules = [
        '综合态势 - 水环境综合态势一张图展示',
        '设施管理 - 排水管网、泵站、排口、污水厂等设施管理',
        '生态整治 - 项目管理、河湖长制业务管理',
        '遥感监测 - 卫星遥感数据分析与展示',
        '应急协同 - 风险识别、应急事件管理',
        '系统管理 - 报表中心、配置中心',
    ]
    
    for module in modules:
        p = doc.add_paragraph(style='List Bullet')
        p.add_run(module)
    
    # 2.2 用户角色
    doc.add_heading('2.2 用户角色', level=2)
    p = doc.add_paragraph('系统根据业务需求和管理层级，定义了以下用户角色：')
    
    table = doc.add_table(rows=6, cols=2)
    table.style = 'Table Grid'
    
    headers = ['角色', '权限说明']
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_shading(cell, 'D9E2F3')
    
    roles = [
        ('系统管理员', '拥有系统全部功能权限，负责用户管理、系统配置、数据字典维护等'),
        ('业务管理员', '负责设施信息维护、项目档案管理、数据审核等业务管理工作'),
        ('河长/湖长', '查看责任区域内河湖信息、巡河记录、事务处理等'),
        ('巡查人员', '使用巡河功能、上报问题、查看任务等'),
        ('普通用户', '查看公开的水环境信息、监测数据、统计报表等'),
    ]
    
    for i, (role, desc) in enumerate(roles, 1):
        table.rows[i].cells[0].text = role
        table.rows[i].cells[1].text = desc
    
    doc.add_paragraph()
    
    # 2.3 系统主界面
    doc.add_heading('2.3 系统主界面', level=2)
    p = doc.add_paragraph('系统主界面采用左侧导航、右侧内容区的经典布局结构。')
    
    doc.add_heading('2.3.1 导航菜单', level=3)
    p = doc.add_paragraph('系统左侧导航栏提供六个一级菜单：')
    
    table = doc.add_table(rows=7, cols=3)
    table.style = 'Table Grid'
    
    headers = ['菜单', '图标', '功能说明']
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_shading(cell, 'D9E2F3')
    
    menus = [
        ('综合态势', '📊', '水环境综合态势一张图展示'),
        ('设施管理', '🏗️', '排水管网、泵站、排口、污水厂等设施管理'),
        ('生态整治', '🌿', '项目管理、河湖长制业务管理'),
        ('遥感监测', '🏔️', '卫星遥感数据分析与展示'),
        ('应急协同', '🛡️', '风险识别、应急事件管理'),
        ('系统管理', '⚙️', '报表中心、配置中心'),
    ]
    
    for i, (menu, icon, desc) in enumerate(menus, 1):
        table.rows[i].cells[0].text = menu
        table.rows[i].cells[1].text = icon
        table.rows[i].cells[2].text = desc
    
    doc.add_paragraph()
    
    doc.add_heading('2.3.2 操作说明', level=3)
    
    operations = [
        ('菜单切换', '点击左侧导航菜单项，切换到对应功能模块'),
        ('子菜单展开', '点击带有箭头的菜单项可展开或收起子菜单'),
        ('报警查看', '点击顶部"报警"按钮可查看当前报警信息'),
        ('地图操作', '鼠标滚轮缩放地图，鼠标左键拖动平移地图，点击点位查看详细信息'),
    ]
    
    for title, desc in operations:
        p = doc.add_paragraph(style='List Number')
        run = p.add_run(f'{title}：')
        run.font.bold = True
        p.add_run(desc)
    
    # 2.4 主要业务流程
    doc.add_heading('2.4 主要业务流程', level=2)
    
    doc.add_heading('2.4.1 设施管理业务流程', level=3)
    p = doc.add_paragraph()
    p.add_run('设施录入 → 信息审核 → 日常巡检 → 问题上报 → 事件处理 → 结果归档')
    
    doc.add_heading('2.4.2 河湖长制业务流程', level=3)
    p = doc.add_paragraph()
    p.add_run('河长巡查 → 问题发现 → 事务创建 → 任务分派 → 处理反馈 → 考核评分')
    
    doc.add_heading('2.4.3 应急事件处理流程', level=3)
    p = doc.add_paragraph()
    p.add_run('事件上报 → 事件评估 → 预案启动 → 应急处置 → 事件复盘 → 档案归档')
    
    doc.add_page_break()

def add_chapter3(doc):
    """第三章 功能介绍"""
    doc.add_heading('第三章 功能介绍', level=1)
    
    # 3.1 综合态势
    doc.add_heading('3.1 综合态势', level=2)
    
    doc.add_heading('3.1.1 功能概述', level=3)
    p = doc.add_paragraph()
    p.add_run('综合态势模块是系统的核心展示页面，以"一张图"的形式集中展示韶山市水环境相关设施的分布情况、运行状态和监测数据。用户可以直观地查看各类水环境要素的空间分布和实时状态。')
    
    doc.add_heading('3.1.2 功能列表', level=3)
    
    table = doc.add_table(rows=9, cols=2)
    table.style = 'Table Grid'
    
    headers = ['功能项', '说明']
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_shading(cell, 'D9E2F3')
    
    functions = [
        ('水系分布展示', '在地图上展示河流、湖泊等水系分布'),
        ('水库分布展示', '展示辖区内水库位置及基本信息'),
        ('排口分布展示', '展示入河排口位置及状态'),
        ('管网布局展示', '展示雨水管网、污水管网的空间布局'),
        ('水质达标展示', '展示监测断面的水质达标情况'),
        ('断面溯源分析', '分析断面污染来源'),
        ('排口报警日历', '展示排口报警的时间分布'),
        ('汛期污染强度分析', '分析汛期污染强度变化趋势'),
    ]
    
    for i, (func, desc) in enumerate(functions, 1):
        table.rows[i].cells[0].text = func
        table.rows[i].cells[1].text = desc
    
    doc.add_paragraph()
    
    doc.add_heading('3.1.3 操作说明', level=3)
    
    operations = [
        ('查看综合态势', [
            '点击左侧导航"综合态势"菜单',
            '系统默认展示韶山市水环境综合态势一张图',
            '地图中央显示主要水系和设施分布',
            '左侧显示统计指标卡片，右侧显示分析看板',
        ]),
        ('图层控制', [
            '点击地图左上角图层控制工具',
            '勾选或取消勾选需要显示的图层',
            '支持的图层包括：水系图层、水库图层、排口图层、管网图层、监测点位图层、视频监控点位图层',
        ]),
        ('查看设施详情', [
            '在地图上点击设施图标（如泵站、排口等）',
            '系统弹出设施详情信息窗口',
            '详情窗口显示设施基本信息、实时监测数据等',
            '可切换查看"实时监测"、"视频监控"等标签页',
        ]),
        ('断面溯源分析', [
            '在右侧分析看板选择"断面达标"标签',
            '选择需要分析的监测断面',
            '点击"溯源分析"按钮',
            '系统展示该断面的污染来源分析结果',
        ]),
    ]
    
    for op_title, steps in operations:
        p = doc.add_paragraph()
        run = p.add_run(op_title)
        run.font.bold = True
        
        for i, step in enumerate(steps, 1):
            p = doc.add_paragraph(style='List Number')
            p.add_run(step)
    
    # 3.2 设施管理
    doc.add_heading('3.2 设施管理', level=2)
    
    doc.add_heading('3.2.1 功能概述', level=3)
    p = doc.add_paragraph()
    p.add_run('设施管理模块用于管理韶山市高新区范围内各类水环境设施的基础信息和运行数据，包括排水管网、泵站、排口、污水厂、事件管理和排水户管理等子系统。')
    
    # 排水管网管理
    doc.add_heading('3.2.2 排水管网管理', level=3)
    
    p = doc.add_paragraph()
    run = p.add_run('排水管点管理')
    run.font.bold = True
    
    p = doc.add_paragraph()
    p.add_run('排水管点管理功能用于管理检查井、雨水口、交汇井、阀门井等各类排水管点的信息。')
    
    p = doc.add_paragraph()
    run = p.add_run('支持操作：')
    run.font.bold = True
    
    ops = ['查询：输入管点编号、名称等条件进行筛选', '新增：点击"新增"按钮，填写管点信息', 
           '编辑：选择一条记录，点击"编辑"修改信息', '删除：选择一条记录，点击"删除"移除数据',
           '导出：将查询结果导出为Excel文件', '地图定位：点击"定位"按钮在地图上查看管点位置']
    for op in ops:
        p = doc.add_paragraph(style='List Bullet')
        p.add_run(op)
    
    # 管点信息字段表
    p = doc.add_paragraph()
    run = p.add_run('管点信息字段：')
    run.font.bold = True
    
    table = doc.add_table(rows=8, cols=2)
    table.style = 'Table Grid'
    
    headers = ['字段名', '说明']
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_shading(cell, 'D9E2F3')
    
    fields = [
        ('管点编号', '管点的唯一标识编码'),
        ('管点名称', '管点的名称'),
        ('管点类型', '检查井/雨水口/交汇井/阀门井等'),
        ('所在位置', '管点所在地址'),
        ('坐标', '管点的地理坐标'),
        ('建设年代', '管点建设年份'),
        ('运行状态', '正常/检修/故障/在建'),
    ]
    
    for i, (field, desc) in enumerate(fields, 1):
        table.rows[i].cells[0].text = field
        table.rows[i].cells[1].text = desc
    
    doc.add_paragraph()
    
    # 泵站管理
    doc.add_heading('3.2.3 泵站管理', level=3)
    
    p = doc.add_paragraph()
    run = p.add_run('泵站信息管理')
    run.font.bold = True
    
    p = doc.add_paragraph()
    p.add_run('泵站信息管理功能用于管理排水泵站、提升泵站等泵站设施的基础信息。')
    
    p = doc.add_paragraph()
    p.add_run('详情页面包含多个标签页：基本信息、设备信息、实时监测、视频监控、运维记录。')
    
    # 泵站信息字段表
    table = doc.add_table(rows=10, cols=2)
    table.style = 'Table Grid'
    
    headers = ['字段名', '说明']
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_shading(cell, 'D9E2F3')
    
    fields = [
        ('泵站编号', '泵站的唯一标识编码'),
        ('泵站名称', '泵站名称'),
        ('泵站类型', '排水泵站/提升泵站/雨水泵站等'),
        ('所在位置', '泵站地址'),
        ('设计规模', '设计排水能力（m³/d）'),
        ('装机容量', '总装机功率（kW）'),
        ('水泵数量', '配备的水泵台数'),
        ('建设年代', '建设年份'),
        ('运行状态', '正常/检修/故障/在建'),
    ]
    
    for i, (field, desc) in enumerate(fields, 1):
        table.rows[i].cells[0].text = field
        table.rows[i].cells[1].text = desc
    
    doc.add_paragraph()
    
    # 排口管理
    doc.add_heading('3.2.4 排口管理', level=3)
    
    p = doc.add_paragraph()
    run = p.add_run('入河排口核查列表')
    run.font.bold = True
    
    p = doc.add_paragraph()
    p.add_run('入河排口核查列表功能用于管理入河排污口的核查信息。支持按行政区划、排口类型、审批状态等条件筛选。')
    
    # 排口信息字段表
    table = doc.add_table(rows=10, cols=2)
    table.style = 'Table Grid'
    
    headers = ['字段名', '说明']
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_shading(cell, 'D9E2F3')
    
    fields = [
        ('排口编码', '入河入海排污口编码（16位）'),
        ('排口名称', '排污口名称'),
        ('排口类型', '工业排污口/生活排污口/混合排污口等'),
        ('一级分类', '按入河入海排污口分类标准'),
        ('二级分类', '细分类型'),
        ('所在位置', '排口地址'),
        ('受纳水体', '排放的河流或水体名称'),
        ('审批登记备案情况', '已审批/已登记/已备案/未办理'),
        ('排水许可证', '是否取得排水许可证'),
    ]
    
    for i, (field, desc) in enumerate(fields, 1):
        table.rows[i].cells[0].text = field
        table.rows[i].cells[1].text = desc
    
    doc.add_paragraph()
    
    # 污水厂管理
    doc.add_heading('3.2.5 污水厂管理', level=3)
    
    p = doc.add_paragraph()
    p.add_run('污水厂信息管理功能用于管理污水处理厂的基础信息。详情包括基本信息、处理工艺、进出水水质、运行数据等。')
    
    # 事件管理
    doc.add_heading('3.2.6 事件管理', level=3)
    
    p = doc.add_paragraph()
    p.add_run('事件列表功能用于管理各类水环境相关事件。支持按事件类型、状态、时间范围筛选。')
    
    # 排水户管理
    doc.add_heading('3.2.7 排水户管理', level=3)
    
    p = doc.add_paragraph()
    p.add_run('排水户管理功能用于管理向排水管网排放污水的单位或个人（排水户）的信息，可查看排水户的排水许可证、排水水质等信息。')
    
    # 3.3 生态整治
    doc.add_heading('3.3 生态整治', level=2)
    
    doc.add_heading('3.3.1 功能概述', level=3)
    p = doc.add_paragraph()
    p.add_run('生态整治模块集项目管理与河湖长制于一体，用于管理水环境治理工程项目和河湖长制日常业务。')
    
    # 项目管理
    doc.add_heading('3.3.2 项目管理', level=3)
    
    p = doc.add_paragraph()
    run = p.add_run('项目档案')
    run.font.bold = True
    
    p = doc.add_paragraph()
    p.add_run('项目档案功能用于管理水环境治理工程项目的档案信息。')
    
    # 项目档案字段表
    table = doc.add_table(rows=12, cols=2)
    table.style = 'Table Grid'
    
    headers = ['字段名', '说明']
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_shading(cell, 'D9E2F3')
    
    fields = [
        ('项目编号', '项目的唯一标识'),
        ('项目名称', '项目名称'),
        ('项目类型', '河道整治/管网建设/污水处理/生态修复等'),
        ('建设地点', '项目建设地址'),
        ('投资金额', '项目总投资（万元）'),
        ('建设单位', '项目建设单位'),
        ('施工单位', '施工单位名称'),
        ('项目状态', '设计中/招标中/施工中/已完工'),
        ('开工日期', '项目开工时间'),
        ('竣工日期', '项目竣工时间'),
        ('项目简介', '项目简要说明'),
    ]
    
    for i, (field, desc) in enumerate(fields, 1):
        table.rows[i].cells[0].text = field
        table.rows[i].cells[1].text = desc
    
    doc.add_paragraph()
    
    p = doc.add_paragraph()
    run = p.add_run('项目资料管理：')
    run.font.bold = True
    
    p = doc.add_paragraph()
    p.add_run('项目档案支持上传和管理可行性研究报告、设计图纸、招投标文件、施工合同、竣工验收报告、审计报告、运维记录等资料。')
    
    # 河湖长制管理
    doc.add_heading('3.3.3 河湖长制管理', level=3)
    
    p = doc.add_paragraph()
    p.add_run('河湖长制管理模块用于支持河湖长制日常业务管理，包括责任段管理、巡河管理、任务管理、考核评分等功能。')
    
    # 河湖长制功能列表
    table = doc.add_table(rows=15, cols=2)
    table.style = 'Table Grid'
    
    headers = ['功能项', '说明']
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_shading(cell, 'D9E2F3')
    
    functions = [
        ('责任段信息', '管理河长责任河段的信息'),
        ('河流信息', '管理辖区内河流的基本信息'),
        ('湖泊信息', '管理辖区内湖泊的基本信息'),
        ('河长责任区域', '管理各级河长的责任区域划分'),
        ('巡河信息', '记录和管理河长的巡河活动'),
        ('巡河数据统计', '提供巡河相关数据的统计分析'),
        ('任务完成情况', '跟踪和管理河湖长制相关任务的执行情况'),
        ('任务完成统计', '提供任务完成情况的统计分析'),
        ('水质监测公示', '展示和公示各监测断面的水质状况'),
        ('事务列表', '管理河湖长制日常事务'),
        ('履职综合评分', '对河长的履职情况进行评分'),
        ('履职综合评分统计', '提供履职评分的统计分析'),
        ('河长通讯录', '提供各级河长的联系方式查询'),
        ('河长变更记录', '记录河长的人事变动情况'),
    ]
    
    for i, (func, desc) in enumerate(functions, 1):
        table.rows[i].cells[0].text = func
        table.rows[i].cells[1].text = desc
    
    doc.add_paragraph()
    
    # 3.4 遥感监测
    doc.add_heading('3.4 遥感监测', level=2)
    
    doc.add_heading('3.4.1 功能概述', level=3)
    p = doc.add_paragraph()
    p.add_run('遥感监测模块利用卫星遥感技术，对水体水质、岸线变化、植被覆盖等进行监测分析，为大范围水环境监测提供技术支撑。')
    
    doc.add_heading('3.4.2 功能列表', level=3)
    
    table = doc.add_table(rows=6, cols=2)
    table.style = 'Table Grid'
    
    headers = ['功能项', '说明']
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_shading(cell, 'D9E2F3')
    
    functions = [
        ('水质指标监测', '基于遥感数据反演叶绿素、悬浮物等水质指标'),
        ('岸线问题监测', '监测岸线违规占用、垃圾堆放等问题'),
        ('岸线变化分析', '分析岸线的变化趋势'),
        ('NDVI植被指数', '监测水体周边植被覆盖情况'),
        ('土地利用分类', '分析区域土地利用类型分布'),
    ]
    
    for i, (func, desc) in enumerate(functions, 1):
        table.rows[i].cells[0].text = func
        table.rows[i].cells[1].text = desc
    
    doc.add_paragraph()
    
    # 3.5 应急协同
    doc.add_heading('3.5 应急协同', level=2)
    
    doc.add_heading('3.5.1 功能概述', level=3)
    p = doc.add_paragraph()
    p.add_run('应急协同模块用于管理水环境应急事件，包括风险源信息管理、应急资源管理和应急事件处置等功能，实现应急事件的快速响应和协同处置。')
    
    doc.add_heading('3.5.2 风险识别', level=3)
    
    # 风险识别功能表
    table = doc.add_table(rows=7, cols=2)
    table.style = 'Table Grid'
    
    headers = ['功能项', '说明']
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_shading(cell, 'D9E2F3')
    
    functions = [
        ('风险源企业信息', '管理可能产生水环境风险的企业信息'),
        ('应急物资', '管理应急物资储备信息'),
        ('社会物资点', '管理可调用的社会应急物资储备点信息'),
        ('应急预案信息', '管理各类应急预案'),
        ('应急队伍信息', '管理应急救援队伍信息'),
        ('应急专家库', '管理应急专家信息'),
    ]
    
    for i, (func, desc) in enumerate(functions, 1):
        table.rows[i].cells[0].text = func
        table.rows[i].cells[1].text = desc
    
    doc.add_paragraph()
    
    doc.add_heading('3.5.3 应急事件管理', level=3)
    
    p = doc.add_paragraph()
    run = p.add_run('应急事件信息管理：')
    run.font.bold = True
    
    p = doc.add_paragraph()
    p.add_run('应急事件信息管理功能用于管理应急事件的全生命周期信息。')
    
    # 应急事件字段表
    table = doc.add_table(rows=11, cols=2)
    table.style = 'Table Grid'
    
    headers = ['字段名', '说明']
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_shading(cell, 'D9E2F3')
    
    fields = [
        ('事件编号', '事件的唯一标识'),
        ('事件标题', '事件名称'),
        ('发生时间', '事件发生时间'),
        ('发生地点', '事件发生位置'),
        ('事件类型', '水污染/化学品泄漏/藻类爆发等'),
        ('事件等级', '一般（IV级）/较大（III级）/重大（II级）/特别重大（I级）'),
        ('信息来源', '群众举报/巡查发现/监测报警/上级通报等'),
        ('事件状态', '待处置/处置中/已控制/已结束'),
        ('处置单位', '负责处置的单位'),
        ('事件描述', '事件详细描述'),
    ]
    
    for i, (field, desc) in enumerate(fields, 1):
        table.rows[i].cells[0].text = field
        table.rows[i].cells[1].text = desc
    
    doc.add_paragraph()
    
    p = doc.add_paragraph()
    run = p.add_run('事件评估：')
    run.font.bold = True
    
    p = doc.add_paragraph()
    p.add_run('事件评估功能用于对应急事件进行影响评估，包括评估影响范围、预测发展趋势、提出处置建议。')
    
    p = doc.add_paragraph()
    run = p.add_run('事件复盘：')
    run.font.bold = True
    
    p = doc.add_paragraph()
    p.add_run('事件复盘功能用于对已结束的应急事件进行总结分析，包括总结事件经过、分析原因、评估处置效果、提出改进建议。')
    
    # 3.6 系统管理
    doc.add_heading('3.6 系统管理', level=2)
    
    doc.add_heading('3.6.1 功能概述', level=3)
    p = doc.add_paragraph()
    p.add_run('系统管理模块提供报表中心和配置中心功能，用于系统数据统计和基础配置管理。')
    
    doc.add_heading('3.6.2 报表中心', level=3)
    
    p = doc.add_paragraph()
    p.add_run('报表中心功能提供各类数据报表的查询、统计和导出功能。')
    
    # 报表类型表
    table = doc.add_table(rows=7, cols=3)
    table.style = 'Table Grid'
    
    headers = ['报表类型', '说明', '时间粒度']
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_shading(cell, 'D9E2F3')
    
    reports = [
        ('地表水水质报表', '水质监测数据报表', '按日期时间'),
        ('水文监测报表', '水位、流量等水文监测数据', '按日期时间'),
        ('日报', '每日监测数据汇总', '按日期'),
        ('月报', '每月数据统计分析', '按月份'),
        ('年报', '年度数据综合分析', '按年份'),
        ('流量报表', '流量监测数据', '按日期时间'),
    ]
    
    for i, (report, desc, granularity) in enumerate(reports, 1):
        table.rows[i].cells[0].text = report
        table.rows[i].cells[1].text = desc
        table.rows[i].cells[2].text = granularity
    
    doc.add_paragraph()
    
    doc.add_heading('3.6.3 配置中心', level=3)
    
    p = doc.add_paragraph()
    p.add_run('配置中心功能用于管理系统基础数据和配置项。')
    
    # 配置类型表
    table = doc.add_table(rows=5, cols=2)
    table.style = 'Table Grid'
    
    headers = ['配置类型', '配置项']
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_shading(cell, 'D9E2F3')
    
    configs = [
        ('污染源配置', '工业污染源、农业污染源、生活污染源'),
        ('水利工程配置', '水库、水闸、堤防、泵站、涵闸、塘坝、取水口'),
        ('遥感配置', '遥感监测相关参数配置'),
        ('园区配置', '工业园区相关配置信息'),
    ]
    
    for i, (config_type, items) in enumerate(configs, 1):
        table.rows[i].cells[0].text = config_type
        table.rows[i].cells[1].text = items
    
    doc.add_page_break()

def add_appendix(doc):
    """添加附录"""
    doc.add_heading('附录', level=1)
    
    doc.add_heading('附录A 常见问题解答', level=2)
    
    faqs = [
        ('Q1: 如何重置登录密码？', '请联系系统管理员进行密码重置。'),
        ('Q2: 数据导出格式支持哪些？', '系统支持导出为Excel格式（.xlsx），部分报表支持PDF格式。'),
        ('Q3: 地图加载缓慢怎么办？', '建议检查网络连接，清除浏览器缓存后重新加载。'),
        ('Q4: 如何报告系统问题？', '可通过系统反馈功能或联系技术支持人员报告问题。'),
    ]
    
    for question, answer in faqs:
        p = doc.add_paragraph()
        run = p.add_run(question)
        run.font.bold = True
        
        p = doc.add_paragraph()
        p.add_run(answer)
    
    doc.add_heading('附录B 技术支持', level=2)
    
    p = doc.add_paragraph()
    p.add_run('如在使用过程中遇到问题，请联系：')
    
    p = doc.add_paragraph()
    run = p.add_run('技术支持单位：')
    run.font.bold = True
    p.add_run('正元地理信息集团股份有限公司')
    
    p = doc.add_paragraph()
    run = p.add_run('联系电话：')
    run.font.bold = True
    p.add_run('[请填写]')
    
    p = doc.add_paragraph()
    run = p.add_run('电子邮箱：')
    run.font.bold = True
    p.add_run('[请填写]')
    
    doc.add_paragraph()
    doc.add_paragraph()
    
    # 文档结束
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('文档结束')
    run.font.bold = True
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run('本手册由正元地理信息集团股份有限公司编制，版权所有，未经许可不得复制或传播。')

def main():
    print("正在生成 Word 文档...")
    
    doc = create_document()
    
    add_cover_page(doc)
    add_revision_history(doc)
    add_toc(doc)
    add_chapter1(doc)
    add_chapter2(doc)
    add_chapter3(doc)
    add_appendix(doc)
    
    output_path = '/Volumes/WhlunService/AxhubMake/docs/韶山市水环境综合整治一张图系统-用户手册.docx'
    doc.save(output_path)
    
    print(f"Word 文档已生成：{output_path}")

if __name__ == '__main__':
    main()
