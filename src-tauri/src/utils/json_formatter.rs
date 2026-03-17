//! JSON 格式化工具函数
//!
//! 提供纯函数的 JSON 处理算法

use crate::models::json_format::{FormatMode, JsonFormatConfig};
use serde_json::{self, Value};

/// 格式化 JSON 字符串
///
/// 对输入的 JSON 字符串进行格式化，支持美化和压缩模式
///
/// # 参数
///
/// * `input` - 输入的 JSON 字符串
/// * `config` - 格式化配置
///
/// # 返回
///
/// 返回格式化后的 JSON 字符串
///
/// # 错误
///
/// 当输入不是有效的 JSON 时返回错误
///
/// # 示例
///
/// ```
/// use crate::utils::json_formatter::format_json;
/// use crate::models::json_format::{JsonFormatConfig, FormatMode};
///
/// let input = r#"{"name":"test","value":123}"#;
/// let config = JsonFormatConfig::default();
/// let result = format_json(input, &config).unwrap();
/// assert!(result.contains('\n'));
/// ```
pub fn format_json(input: &str, config: &JsonFormatConfig) -> Result<String, String> {
    // 解析 JSON
    let mut value: Value = serde_json::from_str(input)
        .map_err(|e| format!("JSON 解析失败: {}", e))?;

    // 如果需要排序 key
    if config.sort_keys {
        sort_keys(&mut value);
    }

    // 根据模式格式化
    match config.mode {
        FormatMode::Pretty => {
            let indent_str = " ".repeat(config.indent as usize);
            serde_json::to_string_pretty(&value)
                .map_err(|e| format!("JSON 格式化失败: {}", e))
                .map(|s| replace_indent(&s, &indent_str))
        }
        FormatMode::Compact => {
            serde_json::to_string(&value)
                .map_err(|e| format!("JSON 序列化失败: {}", e))
        }
    }
}

/// 替换缩进空格数
///
/// serde_json 默认使用 2 空格缩进，此函数将其替换为配置的缩进数
fn replace_indent(json: &str, indent: &str) -> String {
    if indent == "  " {
        return json.to_string();
    }

    json.lines()
        .map(|line| {
            let trimmed = line.trim_start();
            if trimmed.is_empty() {
                return String::new();
            }
            let leading_spaces = line.len() - trimmed.len();
            if leading_spaces > 0 {
                let indent_level = leading_spaces / 2;
                format!("{}{}", indent.repeat(indent_level), trimmed)
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// 对 JSON 对象的 key 进行排序
///
/// 递归遍历 JSON 结构，对所有对象的 key 按字母顺序排序
fn sort_keys(value: &mut Value) {
    match value {
        Value::Object(map) => {
            // 收集所有 key-value 对
            let mut entries: Vec<(String, Value)> = map
                .iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect();

            // 排序 key
            entries.sort_by(|a, b| a.0.cmp(&b.0));

            // 递归处理每个值
            for (_, v) in &mut entries {
                sort_keys(v);
            }

            // 清空并重新插入
            map.clear();
            for (k, v) in entries {
                map.insert(k, v);
            }
        }
        Value::Array(arr) => {
            // 递归处理数组中的每个元素
            for v in arr {
                sort_keys(v);
            }
        }
        _ => {}
    }
}

/// 验证 JSON 字符串是否有效
///
/// 检查输入的字符串是否为有效的 JSON
///
/// # 参数
///
/// * `input` - 输入的 JSON 字符串
///
/// # 返回
///
/// 返回验证结果，包含是否有效和错误信息
///
/// # 示例
///
/// ```
/// use crate::utils::json_formatter::validate_json;
///
/// let result = validate_json(r#"{"valid": true}"#);
/// assert!(result.is_valid);
///
/// let result = validate_json(r#"{"invalid": }"#);
/// assert!(!result.is_valid);
/// ```
pub fn validate_json(input: &str) -> JsonValidateResult {
    match serde_json::from_str::<Value>(input) {
        Ok(_) => JsonValidateResult {
            is_valid: true,
            error_message: None,
            error_line: None,
            error_column: None,
        },
        Err(e) => {
            // 解析错误信息以获取行号和列号
            let error_msg = e.to_string();
            let (line, column) = parse_error_position(&error_msg);

            JsonValidateResult {
                is_valid: false,
                error_message: Some(error_msg),
                error_line: line,
                error_column: column,
            }
        }
    }
}

/// JSON 验证结果结构
#[derive(Debug, Clone)]
pub struct JsonValidateResult {
    pub is_valid: bool,
    pub error_message: Option<String>,
    pub error_line: Option<usize>,
    pub error_column: Option<usize>,
}

/// 从错误信息中解析行号和列号
fn parse_error_position(error_msg: &str) -> (Option<usize>, Option<usize>) {
    // serde_json 的错误格式通常是 "line X, column Y"
    if let Some(line_pos) = error_msg.find("line ") {
        let after_line = &error_msg[line_pos + 5..];
        if let Some(comma_pos) = after_line.find(',') {
            if let Ok(line) = after_line[..comma_pos].parse::<usize>() {
                if let Some(col_pos) = after_line.find("column ") {
                    let after_col = &after_line[col_pos + 7..];
                    if let Some(end_pos) = after_col.find(|c: char| !c.is_ascii_digit()) {
                        if let Ok(col) = after_col[..end_pos].parse::<usize>() {
                            return (Some(line), Some(col));
                        }
                    }
                }
            }
        }
    }
    (None, None)
}

/// 压缩 JSON 字符串
///
/// 去除所有空格和换行，生成最紧凑的 JSON 格式
///
/// # 参数
///
/// * `input` - 输入的 JSON 字符串
///
/// # 返回
///
/// 返回压缩后的 JSON 字符串
///
/// # 错误
///
/// 当输入不是有效的 JSON 时返回错误
pub fn compact_json(input: &str) -> Result<String, String> {
    let value: Value = serde_json::from_str(input)
        .map_err(|e| format!("JSON 解析失败: {}", e))?;

    serde_json::to_string(&value)
        .map_err(|e| format!("JSON 序列化失败: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_json_pretty() {
        let input = r#"{"name":"test","value":123}"#;
        let config = JsonFormatConfig::default();
        let result = format_json(input, &config).unwrap();
        assert!(result.contains('\n'));
        assert!(result.contains("  "));
    }

    #[test]
    fn test_format_json_compact() {
        let input = r#"{  "name"  :  "test"  ,  "value"  :  123  }"#;
        let config = JsonFormatConfig {
            mode: FormatMode::Compact,
            ..Default::default()
        };
        let result = format_json(input, &config).unwrap();
        assert!(!result.contains('\n'));
        assert!(!result.contains(' '));
    }

    #[test]
    fn test_format_json_invalid() {
        let input = r#"{"invalid": }"#;
        let config = JsonFormatConfig::default();
        assert!(format_json(input, &config).is_err());
    }

    #[test]
    fn test_format_json_with_sort_keys() {
        let input = r#"{"z":1,"a":2,"m":3}"#;
        let config = JsonFormatConfig {
            sort_keys: true,
            ..Default::default()
        };
        let result = format_json(input, &config).unwrap();
        // 验证 key 已排序
        let a_pos = result.find("\"a\"").unwrap();
        let m_pos = result.find("\"m\"").unwrap();
        let z_pos = result.find("\"z\"").unwrap();
        assert!(a_pos < m_pos);
        assert!(m_pos < z_pos);
    }

    #[test]
    fn test_validate_json_valid() {
        let result = validate_json(r#"{"valid": true}"#);
        assert!(result.is_valid);
        assert!(result.error_message.is_none());
    }

    #[test]
    fn test_validate_json_invalid() {
        let result = validate_json(r#"{"invalid": }"#);
        assert!(!result.is_valid);
        assert!(result.error_message.is_some());
    }

    #[test]
    fn test_compact_json() {
        let input = r#"{  "name"  :  "test"  }"#;
        let result = compact_json(input).unwrap();
        assert_eq!(result, r#"{"name":"test"}"#);
    }
}
