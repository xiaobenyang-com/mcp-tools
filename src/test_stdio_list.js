#!/usr/bin/env node

import {FastMCP} from "fastmcp";
import {z} from "zod"; // Or any validation library that supports Standard Schema

const calcXiaoBenYangApi = async function (fullArgs) {
    // 发起 GET 请求
    let response = await fetch('https://xiaobenyang.com/api', {
        method: 'POST',
        headers: {
            'APIKEY': process.env.API_KEY,
            'aid': fullArgs.aid
        },
        body: new URLSearchParams(fullArgs)
    });
    return await response.text();
}


/**
 * Java 类型转 Zod 类型的映射表（全类名/简单类名 对应 Zod 函数）
 */
const JAVA_TO_ZOD_MAP = {
    // 基础类型（全类名）
    'java.lang.String': () => z.string(),
    'java.lang.Integer': () => z.number().int(),
    'java.lang.Long': () => z.number().int(),
    'java.lang.Float': () => z.number(),
    'java.lang.Double': () => z.number(),
    'java.lang.Boolean': () => z.boolean(),
    'java.time.LocalDate': () => z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // 简单日期验证
    'java.time.LocalDateTime': () => z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/), // 简单时间验证

    // 集合类型（全类名）
    'java.util.List': (genericType) => z.array(convertJavaTypeToZod(genericType)), // 泛型参数递归转换
    'java.util.Set': (genericType) => z.array(convertJavaTypeToZod(genericType)).unique(), // Set 对应去重数组
    'java.util.Map': (keyType, valueType) => z.record(convertJavaTypeToZod(keyType), convertJavaTypeToZod(valueType)), // Map 对应 record

    // 简单类名映射（防止全类名解析失败时 fallback）
    String: () => z.string(),
    Integer: () => z.number().int(),
    Long: () => z.number().int(),
    Float: () => z.number(),
    Double: () => z.number(),
    Boolean: () => z.boolean(),
    List: (genericType) => z.array(convertJavaTypeToZod(genericType)),
};

/**
 * 解析 Java 泛型类型（如 "List<String>" → { base: "List", generics: ["String"] }）
 * @param {string} javaType Java 类型字符串（可能含泛型）
 * @returns {object} 解析结果 { base: 基础类型, generics: 泛型参数数组 }
 */
function parseGenericType(javaType) {
    const angleBracketIndex = javaType.indexOf('<');
    if (angleBracketIndex === -1) {
        return {base: javaType.trim(), generics: []};
    }

    // 提取基础类型（如 "List<String>" → "List"）
    const baseType = javaType.slice(0, angleBracketIndex).trim();
    // 提取泛型参数（如 "List<String>" → "String"）
    const genericsStr = javaType.slice(angleBracketIndex + 1, javaType.lastIndexOf('>')).trim();

    // 处理嵌套泛型（如 "Map<String, List<Integer>>"）
    const generics = [];
    let balance = 0; // 用于处理嵌套 <> 的平衡
    let current = '';
    for (const char of genericsStr) {
        if (char === '<') balance++;
        if (char === '>') balance--;
        if (char === ',' && balance === 0) {
            generics.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (current) generics.push(current.trim());

    return {base: baseType, generics};
}

/**
 * 将 Java 类型名称转换为 Zod 类型
 * @param {string} javaType Java 类型全名（如 "java.lang.String"、"java.util.List<java.lang.Integer>"）
 * @returns {z.ZodType} Zod 类型对象
 */
function convertJavaTypeToZod(javaType) {
    // 解析泛型（如处理 "List<Integer>" 这种格式）
    const {base: baseType, generics} = parseGenericType(javaType);

    // 优先匹配全类名（如 "java.lang.String"）
    if (JAVA_TO_ZOD_MAP[baseType]) {
        return JAVA_TO_ZOD_MAP[baseType](...generics);
    }

    // 若全类名未匹配，提取简单类名再匹配（如 "String" 从 "java.lang.String" 提取）
    const simpleTypeName = baseType.split('.').pop();
    if (JAVA_TO_ZOD_MAP[simpleTypeName]) {
        return JAVA_TO_ZOD_MAP[simpleTypeName](...generics);
    }

    // 未匹配的类型默认视为自定义对象（返回 z.object()，需手动补充）
    return z.object({});
}


const convertParamsToZ = function (params) {
    let zParams = {};
    for (const param of params) {
        let zodType = convertJavaTypeToZod(param.type)
        if (param.description) {
            zodType = zodType.describe(param.name);
        }
        if (param.required) {
            zodType = zodType.optional();
        }

        zParams[param.name] = zodType;
    }
    return z.object(zParams);
}


fetch('https://xiaobenyang.com/api/' + process.env.MCP_ID, {
    method: 'GET',
}).then((res) => {
    if (!res.ok) throw new Error(`请求失败：${res.status}`);
    return res.json(); // 解析响应体为 JSON（假设返回 { apiDescList: [...] }）
})
    .then((data) => {
        const apiDescList = data.tools;
        const server = new FastMCP({
            name: data.name,
            version: data.version,
        });

        const addToolXiaoBenYangApi = function (aid, title, desc, params) {
            server.addTool({
                name: title,
                description: desc,
                parameters: params,
                execute: async (args) => {
                    // 合并用户输入 args 和工具专属 aid
                    const fullArgs = {...args, aid: aid};
                    return calcXiaoBenYangApi(fullArgs);
                }
            });
        }

        for (const apiDesc of apiDescList) {
            addToolXiaoBenYangApi(apiDesc.apiId.toString(),
                apiDesc.title,
                apiDesc.description ? apiDesc.description : apiDesc.title,
                convertParamsToZ(apiDesc.params));
        }

        server.start({
            transportType: "stdio",
        });
    });


