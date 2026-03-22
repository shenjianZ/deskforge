//! 代码格式化工具函数
//!
//! 提供纯函数的代码处理算法

use crate::models::code_format::{CodeFormatConfig, CodeLanguage, FormatMode};

/// 格式化代码字符串
///
/// 对输入的代码字符串进行格式化，支持美化和压缩模式
///
/// # 参数
///
/// * `input` - 输入的代码字符串
/// * `config` - 格式化配置
///
/// # 返回
///
/// 返回格式化后的代码字符串
///
/// # 错误
///
/// 当代码解析失败时返回错误
pub fn format_code(input: &str, config: &CodeFormatConfig) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("输入内容不能为空".to_string());
    }

    match config.mode {
        FormatMode::Pretty => prettify_code(input, config),
        FormatMode::Compact => compact_code(input, config),
    }
}

/// 美化代码字符串
fn prettify_code(input: &str, config: &CodeFormatConfig) -> Result<String, String> {
    match config.language {
        CodeLanguage::Json => {
            // JSON 使用已有的格式化器
            use crate::utils::json_formatter;
            let json_config = crate::models::json_format::JsonFormatConfig {
                indent: config.indent,
                sort_keys: false,
                mode: crate::models::json_format::FormatMode::Pretty,
            };
            json_formatter::format_json(input, &json_config)
        }
        CodeLanguage::Xml => {
            // XML 使用已有的格式化器
            use crate::utils::xml_formatter;
            let xml_config = crate::models::xml_format::XmlFormatConfig {
                indent: config.indent,
                mode: crate::models::xml_format::FormatMode::Pretty,
            };
            xml_formatter::format_xml(input, &xml_config)
        }
        CodeLanguage::Html => {
            // HTML 使用已有的格式化器
            use crate::utils::html_formatter;
            let html_config = crate::models::html_format::HtmlFormatConfig {
                indent: config.indent,
                mode: crate::models::html_format::FormatMode::Pretty,
            };
            html_formatter::format_html(input, &html_config)
        }
        CodeLanguage::Css => {
            // CSS 使用专业格式化器
            use crate::utils::css_formatter;
            let css_config = crate::models::css_format::CssFormatConfig {
                indent: config.indent,
                mode: crate::models::code_format::FormatMode::Pretty,
            };
            css_formatter::format_css(input, &css_config)
        }
        CodeLanguage::Rust => {
            // Rust 使用专业格式化器
            use crate::utils::rust_formatter;
            let rust_config = crate::models::rust_format::RustFormatConfig {
                indent: config.indent,
                mode: crate::models::code_format::FormatMode::Pretty,
            };
            rust_formatter::format_rust(input, &rust_config)
        }
        _ => {
            // 其他语言使用通用格式化
            generic_prettify(input, config)
        }
    }
}

/// 压缩代码字符串
fn compact_code(input: &str, config: &CodeFormatConfig) -> Result<String, String> {
    match config.language {
        CodeLanguage::Json => {
            use crate::utils::json_formatter;
            let json_config = crate::models::json_format::JsonFormatConfig {
                indent: 2,
                sort_keys: false,
                mode: crate::models::json_format::FormatMode::Compact,
            };
            json_formatter::format_json(input, &json_config)
        }
        CodeLanguage::Xml => {
            use crate::utils::xml_formatter;
            let xml_config = crate::models::xml_format::XmlFormatConfig {
                indent: 2,
                mode: crate::models::xml_format::FormatMode::Compact,
            };
            xml_formatter::format_xml(input, &xml_config)
        }
        CodeLanguage::Html => {
            use crate::utils::html_formatter;
            let html_config = crate::models::html_format::HtmlFormatConfig {
                indent: 2,
                mode: crate::models::html_format::FormatMode::Compact,
            };
            html_formatter::format_html(input, &html_config)
        }
        CodeLanguage::Css => {
            // CSS 使用专业格式化器
            use crate::utils::css_formatter;
            let css_config = crate::models::css_format::CssFormatConfig {
                indent: 2,
                mode: crate::models::code_format::FormatMode::Compact,
            };
            css_formatter::format_css(input, &css_config)
        }
        CodeLanguage::Rust => {
            // Rust 使用专业格式化器
            use crate::utils::rust_formatter;
            let rust_config = crate::models::rust_format::RustFormatConfig {
                indent: 2,
                mode: crate::models::code_format::FormatMode::Compact,
            };
            rust_formatter::format_rust(input, &rust_config)
        }
        _ => {
            // 其他语言使用通用压缩
            generic_compact(input)
        }
    }
}

/// 通用代码美化
fn generic_prettify(input: &str, config: &CodeFormatConfig) -> Result<String, String> {
    let indent_str = if config.use_tabs {
        "\t".to_string()
    } else {
        " ".repeat(config.indent as usize)
    };

    let mut result = String::new();
    let mut indent_level = 0;
    let mut chars = input.chars().peekable();
    let mut in_string = false;
    let mut in_comment = false;
    let mut in_multiline_comment = false;
    let mut string_char = ' ';
    let mut prev_char = ' ';

    while let Some(c) = chars.next() {
        // 处理字符串
        if !in_comment && !in_multiline_comment && (c == '"' || c == '\'' || c == '`') {
            if !in_string {
                in_string = true;
                string_char = c;
            } else if c == string_char && prev_char != '\\' {
                in_string = false;
            }
            result.push(c);
            prev_char = c;
            continue;
        }

        if in_string {
            result.push(c);
            prev_char = c;
            continue;
        }

        // 处理单行注释
        if c == '/' && chars.peek() == Some(&'/') && !in_multiline_comment {
            chars.next();
            in_comment = true;
            result.push_str("//");
            continue;
        }

        if in_comment {
            result.push(c);
            if c == '\n' {
                in_comment = false;
            }
            prev_char = c;
            continue;
        }

        // 处理多行注释
        if c == '/' && chars.peek() == Some(&'*') && !in_comment {
            chars.next();
            in_multiline_comment = true;
            result.push_str("/*");
            continue;
        }

        if in_multiline_comment {
            result.push(c);
            if c == '*' && chars.peek() == Some(&'/') {
                chars.next();
                result.push('/');
                in_multiline_comment = false;
            }
            prev_char = c;
            continue;
        }

        // 处理括号和缩进
        match c {
            '{' | '(' => {
                result.push(c);
                if c == '{' {
                    indent_level += 1;
                    result.push('\n');
                    result.push_str(&indent_str.repeat(indent_level));
                }
            }
            '}' | ')' => {
                if c == '}' && indent_level > 0 {
                    indent_level -= 1;
                    if result.ends_with(&indent_str) {
                        result.truncate(result.len() - indent_str.len());
                    } else if result.ends_with('\n') {
                        result.push_str(&indent_str.repeat(indent_level));
                    } else {
                        result.push('\n');
                        result.push_str(&indent_str.repeat(indent_level));
                    }
                }
                result.push(c);
            }
            ';' => {
                result.push(c);
                if !in_string {
                    result.push('\n');
                    result.push_str(&indent_str.repeat(indent_level));
                }
            }
            '\n' | '\r' => {
                // 跳过多余的换行
                if !result.ends_with('\n') {
                    result.push('\n');
                    result.push_str(&indent_str.repeat(indent_level));
                }
            }
            ' ' | '\t' => {
                // 只保留一个空格
                if !result.ends_with(' ') && !result.ends_with('\n') && !result.ends_with('\t') {
                    result.push(' ');
                }
            }
            _ => {
                result.push(c);
            }
        }

        prev_char = c;
    }

    Ok(result.trim().to_string())
}

/// 通用代码压缩
fn generic_compact(input: &str) -> Result<String, String> {
    let mut result = String::new();
    let mut chars = input.chars().peekable();
    let mut in_string = false;
    let mut string_char = ' ';
    let mut prev_char = ' ';

    while let Some(c) = chars.next() {
        // 处理字符串
        if c == '"' || c == '\'' || c == '`' {
            if !in_string {
                in_string = true;
                string_char = c;
            } else if c == string_char && prev_char != '\\' {
                in_string = false;
            }
            result.push(c);
            prev_char = c;
            continue;
        }

        if in_string {
            result.push(c);
            prev_char = c;
            continue;
        }

        // 处理单行注释
        if c == '/' && chars.peek() == Some(&'/') {
            while let Some(nc) = chars.next() {
                if nc == '\n' {
                    break;
                }
            }
            continue;
        }

        // 处理多行注释
        if c == '/' && chars.peek() == Some(&'*') {
            chars.next();
            while let Some(nc) = chars.next() {
                if nc == '*' && chars.peek() == Some(&'/') {
                    chars.next();
                    break;
                }
            }
            continue;
        }

        // 压缩空格和换行
        if c.is_whitespace() {
            if !result.is_empty() && !result.ends_with(' ') && prev_char.is_ascii_alphanumeric()
                || prev_char == '_'
            {
                result.push(' ');
            }
            prev_char = c;
            continue;
        }

        result.push(c);
        prev_char = c;
    }

    Ok(result.trim().to_string())
}

/// 验证代码字符串
pub fn validate_code(input: &str, language: CodeLanguage) -> CodeValidateResult {
    if input.trim().is_empty() {
        return CodeValidateResult {
            is_valid: false,
            error_message: Some("输入内容不能为空".to_string()),
            error_line: Some(1),
        };
    }

    match language {
        CodeLanguage::Json => {
            use crate::utils::json_formatter;
            let result = json_formatter::validate_json(input);
            CodeValidateResult {
                is_valid: result.is_valid,
                error_message: result.error_message,
                error_line: result.error_line,
            }
        }
        CodeLanguage::Xml => {
            use crate::utils::xml_formatter;
            let result = xml_formatter::validate_xml(input);
            CodeValidateResult {
                is_valid: result.is_valid,
                error_message: result.error_message,
                error_line: result.error_line,
            }
        }
        CodeLanguage::Html => {
            use crate::utils::html_formatter;
            let result = html_formatter::validate_html(input);
            CodeValidateResult {
                is_valid: result.is_valid,
                error_message: result.error_message,
                error_line: result.error_line,
            }
        }
        _ => {
            // 其他语言的简单验证
            CodeValidateResult {
                is_valid: true,
                error_message: None,
                error_line: None,
            }
        }
    }
}

/// 代码验证结果结构
#[derive(Debug, Clone)]
pub struct CodeValidateResult {
    pub is_valid: bool,
    pub error_message: Option<String>,
    pub error_line: Option<usize>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_code_json() {
        let input = "{\"name\":\"test\",\"value\":123}";
        let config = CodeFormatConfig {
            language: CodeLanguage::Json,
            ..Default::default()
        };
        let result = format_code(input, &config).unwrap();
        assert!(result.contains('\n'));
    }

    #[test]
    fn test_format_code_generic() {
        let input = "function test(){let x=1;return x;}";
        let config = CodeFormatConfig {
            language: CodeLanguage::JavaScript,
            ..Default::default()
        };
        let result = format_code(input, &config).unwrap();
        assert!(result.contains('\n'));
    }

    #[test]
    fn test_compact_code() {
        let input = "function test() {\n  let x = 1;\n  return x;\n}";
        let config = CodeFormatConfig {
            language: CodeLanguage::JavaScript,
            mode: FormatMode::Compact,
            ..Default::default()
        };
        let result = format_code(input, &config).unwrap();
        assert!(!result.contains('\n'));
    }
}
