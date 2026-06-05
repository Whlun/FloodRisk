#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import zipfile
import os

def create_docx():
    # 创建docx文件结构
    docx_dir = '/tmp/docx_tmp'
    os.makedirs(docx_dir, exist_ok=True)
    os.makedirs(os.path.join(docx_dir, 'word'), exist_ok=True)
    os.makedirs(os.path.join(docx_dir, '_rels'), exist_ok=True)
    os.makedirs(os.path.join(docx_dir, 'docProps'), exist_ok=True)
    os.makedirs(os.path.join(docx_dir, 'word', '_rels'), exist_ok=True)

    # [Content_Types].xml
    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
'''
    with open(os.path.join(docx_dir, '[Content_Types].xml'), 'w', encoding='utf-8') as f:
        f.write(content_types)

    # _rels/.rels
    rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="/word/document.xml"/>
</Relationships>
'''
    with open(os.path.join(docx_dir, '_rels', '.rels'), 'w', encoding='utf-8') as f:
        f.write(rels)

    # docProps/core.xml
    core = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>韶山市水环境综合整治一张图系统用户手册</dc:title>
  <dc:creator>系统管理员</dc:creator>
  <cp:lastModifiedBy>系统管理员</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-05-08T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-05-08T00:00:00Z</dcterms:modified>
</cp:coreProperties>
'''
    with open(os.path.join(docx_dir, 'docProps', 'core.xml'), 'w', encoding='utf-8') as f:
        f.write(core)

    # docProps/app.xml
    app = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Python</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
</Properties>
'''
    with open(os.path.join(docx_dir, 'docProps', 'app.xml'), 'w', encoding='utf-8') as f:
        f.write(app)

    # word/_rels/document.xml.rels
    doc_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>
'''
    with open(os.path.join(docx_dir, 'word', '_rels', 'document.xml.rels'), 'w', encoding='utf-8') as f:
        f.write(doc_rels)

    # word/document.xml
    document = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>韶山市水环境综合整治一张图系统</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>用户手册</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>版本：V1.0</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>日期：2026年5月</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:t>第一章 系统概述</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>韶山市水环境综合整治一张图系统是一个综合性的水环境管理平台，整合了综合态势、设施管理、生态整治、应急协同、系统管理、遥感监测六大核心模块。</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:t>第二章 综合态势模块</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>综合态势模块为系统的大屏总览入口，在一屏内整合管网与水利设施指标、动态感知摘要、应急资源概况、地理底图上的设施管理同源台账点位与右侧水质与报警分析看板。</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:t>第三章 设施管理系统</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>设施管理系统负责管理排水管网、泵站、排口、污水厂等核心水利设施的台账信息、实时监测数据和事件处理。</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:t>第四章 生态整治管理平台</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>生态整治管理平台整合项目管理与河湖长制两大核心业务模块，实现生态治理项目全生命周期管理与河湖管护责任体系数字化。</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:t>第五章 应急协同模块</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>应急协同模块负责应急事件的登记、处置、评估和复盘，以及风险源识别和应急资源管理。</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:t>第六章 系统管理模块</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>系统管理模块包含报表中心与配置中心两大模块，负责数据报表查询和系统基础数据配置。</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:t>第七章 遥感监测模块</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>遥感监测模块展示遥感影像数据，支持查看水体叶绿素、悬浮物分布、疑似问题图斑等信息。</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:t>第八章 工具栏操作指南</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>地图左上角纵向工具条包含13项功能：搜索、POI提示配置、图层控制、地图标注、量尺工具、地图视角、地图样式、视图导出、视频点位、POI提示、放大、缩小、定位复位。</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:t>附录：图例说明</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>设施状态：红色-报警、橙色-离线、绿色-在线、蓝色-信息点</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>水质类别：I类(蓝)-水质最优、II类(绿)-水质良好、III类(浅绿)-水质一般、IV类(黄)-轻度污染、V类(橙)-中度污染、劣V类(红)-重度污染</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:t>文档结束</w:t>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>
'''
    with open(os.path.join(docx_dir, 'word', 'document.xml'), 'w', encoding='utf-8') as f:
        f.write(document)

    # 创建docx文件
    output_path = '/Volumes/WhlunService/AxhubMake/docs/韶山市水环境综合整治一张图系统-用户手册.docx'
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.write(os.path.join(docx_dir, '[Content_Types].xml'), '[Content_Types].xml')
        zf.write(os.path.join(docx_dir, '_rels', '.rels'), '_rels/.rels')
        zf.write(os.path.join(docx_dir, 'docProps', 'core.xml'), 'docProps/core.xml')
        zf.write(os.path.join(docx_dir, 'docProps', 'app.xml'), 'docProps/app.xml')
        zf.write(os.path.join(docx_dir, 'word', 'document.xml'), 'word/document.xml')
        zf.write(os.path.join(docx_dir, 'word', '_rels', 'document.xml.rels'), 'word/_rels/document.xml.rels')

    print(f'Word文档已生成: {output_path}')

if __name__ == '__main__':
    create_docx()
