//! CSS 代码格式化工具
//!
//! 使用 lightningcss 进行专业的 CSS 代码格式化

use crate::models::css_format::CssFormatConfig;
#[cfg(test)]
use crate::models::css_format::CssValidateResult;

/// 格式化 CSS 代码
///
/// # 参数
///
/// * `input` - 输入的代码字符串
/// * `config` - 格式化配置
///
/// # 返回
///
/// 返回格式化后的代码字符串
pub fn format_css(input: &str, config: &CssFormatConfig) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("输入内容不能为空".to_string());
    }

    match config.mode {
        crate::models::code_format::FormatMode::Pretty => {
            prettify_css(input, config)
        }
        crate::models::code_format::FormatMode::Compact => {
            compact_css(input)
        }
    }
}

/// 美化模式格式化
fn prettify_css(input: &str, config: &CssFormatConfig) -> Result<String, String> {
    use lightningcss::stylesheet::{ParserOptions, StyleSheet};

    // 解析 CSS
    let stylesheet = StyleSheet::parse(input, ParserOptions::default())
        .map_err(|e| format!("CSS 解析失败: {:?}", e))?;

    // 使用 Printer 打印格式化的代码
    use lightningcss::printer::PrinterOptions;
    let printer = PrinterOptions {
        minify: false,
        ..Default::default()
    };

    let result = stylesheet
        .to_css(printer)
        .map_err(|e| format!("CSS 格式化失败: {:?}", e))?;

    // lightningcss alpha 版本不支持直接设置缩进，需要后处理
    let formatted = apply_css_indent(&result.code, config.indent);

    Ok(formatted)
}

/// 应用 CSS 缩进
fn apply_css_indent(code: &str, indent_size: u32) -> String {
    let indent_str = " ".repeat(indent_size as usize);
    let mut result = String::new();
    let mut in_rule = false;
    let mut brace_depth = 0;

    for line in code.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if trimmed.contains('}') {
            if brace_depth > 0 {
                brace_depth -= 1;
            }
            result.push_str(&indent_str.repeat(brace_depth));
            result.push_str(trimmed);
            result.push('\n');
            in_rule = false;
        } else if trimmed.contains('{') {
            result.push_str(&indent_str.repeat(brace_depth));
            result.push_str(trimmed);
            result.push('\n');
            brace_depth += 1;
            in_rule = true;
        } else if in_rule {
            // 属性行，添加额外缩进
            result.push_str(&indent_str.repeat(brace_depth));
            result.push_str(trimmed);
            result.push('\n');
        } else {
            result.push_str(trimmed);
            result.push('\n');
        }
    }

    result.trim().to_string()
}

/// 压缩模式格式化
fn compact_css(input: &str) -> Result<String, String> {
    use lightningcss::stylesheet::{ParserOptions, StyleSheet};
    use lightningcss::printer::PrinterOptions;

    // 解析 CSS
    let stylesheet = StyleSheet::parse(input, ParserOptions::default())
        .map_err(|e| format!("CSS 解析失败: {:?}", e))?;

    // 压缩模式
    let printer = PrinterOptions {
        minify: true,
        ..Default::default()
    };

    let result = stylesheet
        .to_css(printer)
        .map_err(|e| format!("CSS 压缩失败: {:?}", e))?;

    Ok(result.code)
}

/// 验证 CSS 代码
///
/// # 参数
///
/// * `input` - 输入的代码字符串
///
/// # 返回
///
/// 返回验证结果
#[cfg(test)]
pub fn validate_css(input: &str) -> CssValidateResult {
    if input.trim().is_empty() {
        return CssValidateResult {
            is_valid: false,
            error_message: Some("输入内容不能为空".to_string()),
            error_line: Some(1),
        };
    }

    use lightningcss::stylesheet::{ParserOptions, StyleSheet};

    match StyleSheet::parse(input, ParserOptions::default()) {
        Ok(_) => CssValidateResult {
            is_valid: true,
            error_message: None,
            error_line: None,
        },
        Err(e) => {
            // lightningcss 的错误不包含行号信息
            CssValidateResult {
                is_valid: false,
                error_message: Some(format!("语法错误: {:?}", e)),
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
    fn test_format_simple_css() {
        let input = "div{color:red;margin:10px}";
        let config = CssFormatConfig {
            indent: 2,
            mode: FormatMode::Pretty,
        };

        let result = format_css(input, &config);
        assert!(result.is_ok());
        let formatted = result.unwrap();
        println!("Formatted CSS:\n{}", formatted);
    }

    #[test]
    fn test_compact_css() {
        let input = "div { color: red; margin: 10px; }";
        let config = CssFormatConfig {
            indent: 2,
            mode: FormatMode::Compact,
        };

        let result = format_css(input, &config);
        assert!(result.is_ok());
        let compacted = result.unwrap();
        println!("Compacted CSS:\n{}", compacted);
    }

    #[test]
    fn test_validate_valid_css() {
        let input = "div { color: red; }";
        let result = validate_css(input);
        assert!(result.is_valid);
    }
}
