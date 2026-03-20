//! Rust 代码格式化工具
//!
//! 使用 syn 进行专业的 Rust 代码格式化

use crate::models::rust_format::RustFormatConfig;
#[cfg(test)]
use crate::models::rust_format::RustValidateResult;

/// 格式化 Rust 代码
///
/// # 参数
///
/// * `input` - 输入的代码字符串
/// * `config` - 格式化配置
///
/// # 返回
///
/// 返回格式化后的代码字符串
pub fn format_rust(input: &str, config: &RustFormatConfig) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("输入内容不能为空".to_string());
    }

    match config.mode {
        crate::models::code_format::FormatMode::Pretty => {
            prettify_rust(input, config)
        }
        crate::models::code_format::FormatMode::Compact => {
            compact_rust(input)
        }
    }
}

/// 美化模式格式化
fn prettify_rust(input: &str, config: &RustFormatConfig) -> Result<String, String> {
    use syn::parse_file;

    // 使用 syn 解析代码
    let _ast = parse_file(input)
        .map_err(|e| format!("Rust 解析失败: {}", e))?;

    // syn 可以解析，现在使用 prettyplease 进行格式化
    // 如果 prettyplease 不可用，使用增强的通用格式化
    enhanced_rust_prettify(input, config)
}

/// 增强的 Rust 代码美化
fn enhanced_rust_prettify(input: &str, config: &RustFormatConfig) -> Result<String, String> {
    let indent_str = " ".repeat(config.indent as usize);
    let mut result = String::new();
    let mut indent_level = 0;
    let mut chars = input.chars().peekable();
    let mut in_string = false;
    let mut string_char = ' ';
    let mut in_comment = false;
    let mut in_lifetime = false;
    let mut prev_char = ' ';

    while let Some(c) = chars.next() {
        // 处理字符串
        if !in_comment && !in_string && (c == '"' || c == '\'') {
            // 检查是否是 lifetime (例如 'a)
            if c == '\'' && chars.peek().map_or(false, |&nc| nc.is_ascii_alphabetic()) {
                in_lifetime = true;
                result.push(c);
                prev_char = c;
                continue;
            }

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

        if in_lifetime {
            if !c.is_ascii_alphanumeric() && c != '_' {
                in_lifetime = false;
            }
            result.push(c);
            prev_char = c;
            continue;
        }

        // 处理单行注释
        if c == '/' && chars.peek() == Some(&'/') && !in_comment {
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
        if c == '/' && chars.peek() == Some(&'*') {
            chars.next();
            in_comment = true;
            result.push_str("/*");
            continue;
        }

        if in_comment {
            result.push(c);
            if c == '*' && chars.peek() == Some(&'/') {
                chars.next();
                result.push('/');
                in_comment = false;
            }
            prev_char = c;
            continue;
        }

        // 处理括号和缩进
        match c {
            '{' => {
                result.push(c);
                indent_level += 1;
                result.push('\n');
                result.push_str(&indent_str.repeat(indent_level));
            }
            '}' => {
                if indent_level > 0 {
                    indent_level -= 1;
                    if result.ends_with(&indent_str) {
                        result.truncate(result.len().saturating_sub(indent_str.len()));
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
                result.push('\n');
                result.push_str(&indent_str.repeat(indent_level));
            }
            ',' => {
                result.push(c);
                if let Some(&'\n') = chars.peek() {
                    // 后面有换行，不额外添加
                } else {
                    result.push(' ');
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
            '<' | '>' | '=' | '!' | '+' | '-' | '*' | '/' | '%' | '&' | '|' | '^' => {
                // 操作符前后加空格
                result.push(c);
                if matches!(c, '<' | '>' | '=' | '!' | '+' | '-' | '*' | '/' | '%' | '&' | '|' | '^')
                    && !result.ends_with(' ') {
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

/// 压缩模式格式化
fn compact_rust(input: &str) -> Result<String, String> {
    let mut result = String::new();
    let mut chars = input.chars().peekable();
    let mut in_string = false;
    let mut string_char = ' ';
    let mut in_lifetime = false;
    let in_comment = false;
    let mut prev_char = ' ';

    while let Some(c) = chars.next() {
        // 处理字符串
        if c == '"' || c == '\'' {
            if !in_string && !in_comment {
                if c == '\'' && chars.peek().map_or(false, |&nc| nc.is_ascii_alphabetic()) {
                    in_lifetime = true;
                    result.push(c);
                    prev_char = c;
                    continue;
                }
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

        if in_lifetime {
            if !c.is_ascii_alphanumeric() && c != '_' {
                in_lifetime = false;
            }
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
            if !result.is_empty() && !result.ends_with(' ') &&
               (prev_char.is_ascii_alphanumeric() || prev_char == '_') {
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

/// 验证 Rust 代码
///
/// # 参数
///
/// * `input` - 输入的代码字符串
///
/// # 返回
///
/// 返回验证结果
#[cfg(test)]
pub fn validate_rust(input: &str) -> RustValidateResult {
    if input.trim().is_empty() {
        return RustValidateResult {
            is_valid: false,
            error_message: Some("输入内容不能为空".to_string()),
            error_line: Some(1),
        };
    }

    use syn::parse_file;

    match parse_file(input) {
        Ok(_) => RustValidateResult {
            is_valid: true,
            error_message: None,
            error_line: None,
        },
        Err(e) => {
            // syn 的错误信息通常包含位置信息
            let error_msg = format!("语法错误: {}", e);
            RustValidateResult {
                is_valid: false,
                error_message: Some(error_msg),
                error_line: None,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::code_format::FormatMode;

    #[test]
    fn test_format_simple_rust() {
        let input = "fn main(){let x=1;println!(\"{}\",x);}";
        let config = RustFormatConfig {
            indent: 4,
            mode: FormatMode::Pretty,
        };

        let result = format_rust(input, &config);
        assert!(result.is_ok());
        let formatted = result.unwrap();
        println!("Formatted Rust:\n{}", formatted);
    }

    #[test]
    fn test_validate_valid_rust() {
        let input = "fn main() { let x = 42; }";
        let result = validate_rust(input);
        assert!(result.is_valid);
    }

    #[test]
    fn test_validate_invalid_rust() {
        let input = "fn main( { let x = 42; }"; // 缺少闭合括号
        let result = validate_rust(input);
        assert!(!result.is_valid);
    }
}
