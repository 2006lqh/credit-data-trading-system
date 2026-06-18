# 可信征信数据加密与交易系统

## 项目概述

可信征信数据加密与交易系统面向征信数据可信流通场景，提供从数据导入、加密存证、交易授权、风险评级到自动审计的完整演示流程。系统以客户征信记录为输入，生成可信数据资产，模拟数据交易和授权过程，并输出客户信用评级结果。

项目重点展示征信数据在流通过程中的完整性保护、授权控制、过程追踪和结果审计。系统支持批量客户数据处理，适用于网络技术挑战赛、可信数据流通原型展示和相关课程项目演示。

## 功能特性

- **数据导入**：支持 CSV 和 JSON 格式的征信记录导入。
- **案例数据库**：内置简易样本、稳定还款、轻度波动、多指标混合、逾期客户和高负债高查询等多类批量案例。
- **批量评级**：支持一次性处理多个客户并生成信用评级。
- **加密存证**：为导入数据生成哈希、签名和可信资产记录。
- **交易模拟**：模拟可信数据交易创建、授权签名和状态流转。
- **风险计算**：根据逾期次数、还款率、贷款数量、额度使用率、负债收入比、近期查询次数和收入等级计算评级。
- **自动审计**：审计评级结果是否被篡改，发现异常时阻断交易并停止输出。
- **过程展示**：以阶段化方式展示导入、加密、交易、授权、风控、审计和输出结果。
- **结果导出**：最终评级结果可通过浏览器打印功能保存为 PDF。

## 系统流程

```text
征信数据导入
    ↓
数据哈希与签名
    ↓
可信数据资产生成
    ↓
交易创建与用户授权
    ↓
风险评级计算
    ↓
自动审计校验
    ↓
最终评级输出
```

正常风险评级不会触发警示；只有在评级结果被篡改时，自动审计模块才会阻断流程。

## 技术架构

系统采用前后端同源架构：

```text
React + Vite  前端界面
FastAPI       后端服务
Docker        统一构建与运行环境
```

前端负责数据录入、案例展示、流程进度、结果弹窗和过程明细展示。后端负责数据资产生成、哈希签名、交易授权、风险计算和审计校验。生产运行时，FastAPI 同时托管后端接口和前端静态页面。

## 目录结构

```text
backend/
  main.py              后端接口、风险计算、审计逻辑和静态页面托管
  requirements.txt     Python 依赖

frontend/
  index.html           前端入口页面
  package.json         前端依赖与构建脚本
  package-lock.json    前端依赖锁定文件
  src/
    App.jsx            系统主界面与交互逻辑
    api.js             前端接口请求封装
    main.jsx           React 挂载入口

Dockerfile             前后端同源服务构建文件
render.yaml            云端服务配置文件
.dockerignore          Docker 构建排除规则
.gitignore             Git 提交排除规则
```

## 数据格式

系统支持数据库导出的 CSV 或 JSON。推荐字段如下：

```text
customer_id
customer_name
overdue_count_12m
credit_card_repayment_rate
loan_count
credit_utilization
debt_to_income_ratio
recent_credit_inquiries_3m
income_level
```

案例数据库中还包含 age、city_tier、region、job_type、employment_years、mortgage_status、credit_history_months、monthly_income、available_credit_limit、existing_credit_products、public_record_flag、last_loan_status、bank_relationship_years 等客户画像字段，用于展示更接近真实数据库宽表的导入效果。评分计算仍以前述征信核心字段为准，扩展字段用于展示、留痕和审计。

CSV 示例：

```csv
customer_id,customer_name,overdue_count_12m,credit_card_repayment_rate,loan_count,credit_utilization,debt_to_income_ratio,recent_credit_inquiries_3m,income_level,age,city_tier,job_type,monthly_income
CUST-001,稳定客户001,0,0.98,1,0.20,0.25,0,high,32,新一线城市,国企事业,12600
CUST-002,波动客户002,1,0.95,3,0.35,0.30,1,medium,41,二线城市,制造业,9800
```

JSON 示例：

```json
[
  {
    "customer_id": "CUST-001",
    "customer_name": "稳定客户001",
    "overdue_count_12m": 0,
    "credit_card_repayment_rate": 0.98,
    "loan_count": 1,
    "credit_utilization": 0.20,
    "debt_to_income_ratio": 0.25,
    "recent_credit_inquiries_3m": 0,
    "income_level": "high",
    "age": 32,
    "city_tier": "新一线城市",
    "job_type": "国企事业",
    "monthly_income": 12600
  }
]
```

## 评级说明

系统根据客户征信指标计算综合信用分，并映射为以下评级：

```text
低风险
中风险
高风险
```

评级结果仅用于项目演示和流程验证，不代表真实金融机构的授信结论。

## 演示账号

```text
用户名：zhixingheyi
密码：321654987
```

## 项目说明

本系统为可信征信数据交易流程原型，主要用于展示数据可信流通、授权交易、风险评级和自动审计机制。项目不连接真实征信系统、真实区块链主网或生产支付环境。
