## 在线新闻

本MCP服务封装了新闻相关工具。

## 工具列表

本MCP服务封装了新闻相关工具，可让模型通过标准化接口调用以下功能：

| 工具名称	 | 描述                 |
|-------|--------------------|
| aa    | 	xxxx（例如：实时热点新闻查询） |
| bb    | 	yyy（例如：新闻内容关键词提取） |


## 前置需求 ｜ Prerequisite
Node.js 22 版本或以上。

Node.js 22 or above.

## 开始使用 ｜ Start

###  使用 Streamable HTTP 启动 | Start by Streamable HTTP transport
```
npm start
```

### 使用 Stdio 启动 ｜ Start by Stdio transport


```
{
    "mcpServers": {
        "xiaobenyang-mcp": {
          "command": "npx", 
          "args": [
            "xiaobenyang-mcp"
          ],
          "env": { 
            "API_KEY": "你的实际apikey", 
            "MCP_ID": "你的实际mcpId",  
            "LOG_LEVEL": "info" 
          },
          "transport": "stdio"
        }
      }
}
```

##  Inspector
npx @modelcontextprotocol/inspector npx xiaobenyang-mcp
